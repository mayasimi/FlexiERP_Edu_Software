'use client'

import { ReactNode, useMemo, useState } from 'react'
import { usePaystackPayment } from 'react-paystack'
import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import { BORDER, GOLD, GREEN, RED, TEXT, TEXT2 } from '@/constants'
import type { PayrollPayment } from '@/types/payroll'
import { isLikelyPaystackReference, isValidPaystackPublicKey, maskAccountNumber, toPaystackKobo } from '@/lib/security'

interface PayrollPayStackModalProps {
  isOpen: boolean
  onClose: () => void
  payment: PayrollPayment | null
  adminEmail: string
  onSuccess: (payment: { staffId: string; reference: string; amount: number }) => void | Promise<void>
  onError: (error: string) => void
}

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error'

export default function PayrollPayStackModal({
  isOpen,
  onClose,
  payment,
  adminEmail,
  onSuccess,
  onError,
}: PayrollPayStackModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
  const hasPaystackKey = isValidPaystackPublicKey(publicKey)
  const isAmountValid = Boolean(payment && payment.amount > 0 && Number.isFinite(payment.amount))

  const reference = useMemo(
    () => `payroll-${payment?.staffId || 'staff'}-${Date.now()}`,
    [payment?.staffId],
  )

  const initializePayment = usePaystackPayment({
    reference,
    email: adminEmail,
    amount: payment && isAmountValid ? toPaystackKobo(payment.amount) : 0,
    publicKey,
    currency: 'NGN',
    metadata: {
      custom_fields: [
        { display_name: 'Payment Type', variable_name: 'payment_type', value: 'Payroll' },
        { display_name: 'Staff Name', variable_name: 'staff_name', value: payment?.staffName || '' },
        { display_name: 'Staff ID', variable_name: 'staff_id', value: payment?.staffId || '' },
        { display_name: 'Role', variable_name: 'role', value: payment?.role || '' },
      ],
    },
  })

  const resetAndClose = () => {
    if (paymentStatus === 'processing') return
    setPaymentStatus('idle')
    setErrorMessage('')
    onClose()
  }

  const handlePayment = () => {
    if (!payment) return

    if (!hasPaystackKey) {
      const message = 'PayStack public key is missing or invalid'
      setPaymentStatus('error')
      setErrorMessage(message)
      onError(message)
      return
    }

    if (!isAmountValid) {
      const message = 'Payroll amount could not be validated'
      setPaymentStatus('error')
      setErrorMessage(message)
      onError(message)
      return
    }

    setPaymentStatus('processing')
    setErrorMessage('')
    initializePayment({
      onSuccess: async (response) => {
        const paymentReference = response?.reference || reference
        if (!isLikelyPaystackReference(paymentReference)) {
          const message = 'Payment reference could not be validated'
          setPaymentStatus('error')
          setErrorMessage(message)
          onError(message)
          return
        }

        try {
          await onSuccess({ staffId: payment.staffId, reference: paymentReference, amount: payment.amount })
          setPaymentStatus('success')
          setTimeout(() => {
            setPaymentStatus('idle')
            onClose()
          }, 2000)
        } catch {
          const message = 'Payroll payment received by PayStack but the payroll record could not be updated'
          setPaymentStatus('error')
          setErrorMessage(message)
          onError(message)
        }
      },
      onClose: () => {
        const message = 'Payroll payment was cancelled'
        setPaymentStatus('idle')
        setErrorMessage(message)
        onError(message)
      },
    })
  }

  if (!isOpen || !payment) return null

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={resetAndClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payroll-paystack-modal-title"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          maxWidth: 500,
          width: '100%',
          padding: 24,
          position: 'relative',
          boxShadow: '0 20px 60px rgba(13, 13, 13, 0.18)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Close payroll payment modal"
          onClick={resetAndClose}
          disabled={paymentStatus === 'processing'}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            cursor: paymentStatus === 'processing' ? 'not-allowed' : 'pointer',
            opacity: paymentStatus === 'processing' ? 0.5 : 1,
          }}
        >
          <X size={20} color={TEXT2} />
        </button>

        <h3 id="payroll-paystack-modal-title" style={{ fontSize: 20, fontWeight: 600, color: TEXT, margin: '0 0 8px' }}>
          Pay Staff Salary
        </h3>
        <p style={{ fontSize: 13, color: TEXT2, margin: '0 0 20px' }}>
          Review this payroll item and continue with PayStack.
        </p>

        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT }}>{payment.staffName}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: TEXT2 }}>{payment.role} / {payment.staffId}</p>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: GOLD }}>
              NGN {payment.amount.toLocaleString()}
            </span>
          </div>
          <div style={{ backgroundColor: '#F9F8F6', borderRadius: 8, padding: 12, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: TEXT2 }}>Bank</span>
              <strong>{payment.bankName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 6 }}>
              <span style={{ color: TEXT2 }}>Account</span>
              <strong>{maskAccountNumber(payment.accountNumber)}</strong>
            </div>
          </div>
        </div>

        {paymentStatus === 'processing' && (
          <StatusMessage color={GOLD} icon={<Loader2 className="animate-spin" size={20} color={GOLD} />}>
            Redirecting to PayStack...
          </StatusMessage>
        )}

        {paymentStatus === 'success' && (
          <StatusMessage color={GREEN} icon={<CheckCircle size={20} color={GREEN} />}>
            Payroll payment successful. Updating staff record...
          </StatusMessage>
        )}

        {paymentStatus === 'error' && (
          <StatusMessage color={RED} icon={<AlertCircle size={20} color={RED} />}>
            {errorMessage}
          </StatusMessage>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={resetAndClose}
            disabled={paymentStatus === 'processing'}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#FFFFFF',
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: paymentStatus === 'processing' ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={paymentStatus === 'processing' || !isAmountValid}
            style={{
              flex: 2,
              padding: '12px',
              backgroundColor: GOLD,
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: '#0D0D0D',
              cursor: paymentStatus === 'processing' || !isAmountValid ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {paymentStatus === 'processing' ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Processing...
              </>
            ) : (
              `Pay NGN ${payment.amount.toLocaleString()}`
            )}
          </button>
        </div>

        <p style={{ fontSize: 10, color: TEXT2, textAlign: 'center', margin: '16px 0 0' }}>
          Secure payroll payment powered by PayStack
        </p>
      </div>
    </div>
  )
}

function StatusMessage({ children, color, icon }: { children: string; color: string; icon: ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: `${color}10`,
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: TEXT,
        fontSize: 13,
      }}
    >
      {icon}
      <span>{children}</span>
    </div>
  )
}

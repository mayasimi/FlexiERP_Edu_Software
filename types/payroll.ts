export interface Staff {
  id: string
  name: string
  role: string
  basePay: number
  currentPay: number
  paid: boolean
  bankName: string
  accountNumber: string
}

export type PayrollFilter = 'all' | 'paid' | 'unpaid'

export interface PayrollSummary {
  totalStaff: number
  totalBasePay: number
  totalCurrentPay: number
  paidStaff: number
  unpaidStaff: number
}

export interface PayrollPayment {
  staffId: string
  staffName: string
  role: string
  amount: number
  bankName: string
  accountNumber: string
}

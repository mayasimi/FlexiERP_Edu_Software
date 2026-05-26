export function toPaystackKobo(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid payment amount')
  }

  return Math.round(amount * 100)
}

export function isValidPaystackPublicKey(publicKey: string) {
  return /^pk_(test|live)_[A-Za-z0-9_]+$/.test(publicKey)
}

export function isLikelyPaystackReference(reference: string) {
  return /^[A-Za-z0-9._=-]{6,120}$/.test(reference)
}

export function maskAccountNumber(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, '')
  if (digits.length < 4) return '****'
  return `**** ${digits.slice(-4)}`
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

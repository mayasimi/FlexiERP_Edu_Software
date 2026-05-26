# EduManage Security Notes

## Frontend Security Implemented

- Paystack payments use only the public key from `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.
- Paystack secret keys are not used or exposed in the frontend.
- Payment amounts are validated before checkout and converted to kobo with a shared helper.
- Paystack references are validated before local fee or payroll records are updated.
- Payroll account numbers are masked in the UI.
- Payroll bank/account details are not sent in Paystack metadata.
- Auth token fallback is session-scoped instead of persistent `localStorage`.
- API clients send credentials so secure cookie auth can work when the backend supports it.
- Route protection is handled in `proxy.ts` for protected app areas.
- Security headers and a Content Security Policy are configured in `next.config.js`.
- Wildcard remote image loading is disabled.

## Backend Recommendations

- Verify every Paystack transaction server-side before permanently marking fees or payroll as paid.
- Add backend endpoints such as:
  - `POST /api/fees/payments/verify-paystack`
  - `POST /api/payroll/payments/verify-paystack`
- Use the Paystack secret key only on the backend.
- Confirm transaction `status`, `amount`, `currency`, `reference`, and the intended student or staff record.
- Make payment verification idempotent so refreshing or retrying cannot create duplicate payments.
- Store payment references, gateway status, payer, amount, currency, and verification timestamps.
- Prefer secure, httpOnly, SameSite cookies for auth.
- Enforce CSRF protection on cookie-authenticated write requests.
- Never trust frontend role, amount, staff IDs, fee IDs, or payment status without backend authorization checks.

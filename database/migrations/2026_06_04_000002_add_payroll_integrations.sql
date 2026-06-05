-- Backend handoff migration: Paystack payroll references and FIRS tax records.

CREATE TABLE payroll_payment_references (
  id CHAR(36) PRIMARY KEY,
  payroll_period_id CHAR(36) NULL,
  staff_id CHAR(36) NULL,
  reference VARCHAR(120) NOT NULL UNIQUE,
  provider ENUM('paystack') NOT NULL DEFAULT 'paystack',
  amount DECIMAL(14, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  status ENUM('pending', 'successful', 'failed') NOT NULL DEFAULT 'pending',
  authorization_url TEXT NULL,
  provider_payload JSON NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX payroll_payment_refs_staff_idx (staff_id),
  INDEX payroll_payment_refs_period_idx (payroll_period_id),
  INDEX payroll_payment_refs_status_idx (status)
);

CREATE TABLE payroll_tax_records (
  id CHAR(36) PRIMARY KEY,
  staff_id CHAR(36) NOT NULL,
  payroll_period_id CHAR(36) NULL,
  gross_pay DECIMAL(14, 2) NOT NULL,
  pension DECIMAL(14, 2) NOT NULL DEFAULT 0,
  relief DECIMAL(14, 2) NOT NULL DEFAULT 0,
  taxable_income DECIMAL(14, 2) NOT NULL,
  tax_amount DECIMAL(14, 2) NOT NULL,
  firs_reference VARCHAR(120) NULL,
  firs_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX payroll_tax_staff_period_idx (staff_id, payroll_period_id)
);

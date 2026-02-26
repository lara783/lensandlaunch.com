ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_type text;

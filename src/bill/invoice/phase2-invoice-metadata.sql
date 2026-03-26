ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS uuid VARCHAR(64),
ADD COLUMN IF NOT EXISTS icv VARCHAR(100),
ADD COLUMN IF NOT EXISTS previous_hash TEXT,
ADD COLUMN IF NOT EXISTS issue_timestamp TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UQ_invoices_uuid'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT "UQ_invoices_uuid" UNIQUE (uuid);
  END IF;
END $$;

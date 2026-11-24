-- Add carrier column to emergency_contacts table for SMS gateway routing
ALTER TABLE emergency_contacts
ADD COLUMN IF NOT EXISTS carrier TEXT DEFAULT 'airtel';

-- Add comment to explain the column
COMMENT ON COLUMN emergency_contacts.carrier IS 'Mobile carrier for SMS gateway (airtel, vodafone, jio, bsnl, att, verizon, tmobile, sprint)';

-- Add check constraint for supported carriers
ALTER TABLE emergency_contacts
ADD CONSTRAINT valid_carrier CHECK (
  carrier IN (
    'airtel', 'vodafone', 'idea', 'jio', 'bsnl',  -- India
    'att', 'verizon', 'tmobile', 'sprint'          -- US
  )
);

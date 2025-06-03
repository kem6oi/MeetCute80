BEGIN;

-- 1. Add column user_provided_reference TEXT NULL
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS user_provided_reference TEXT NULL;

-- 2. Add column admin_notes TEXT NULL
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL;

-- 3. Add column payable_item_id INTEGER NULL
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payable_item_id INTEGER NULL;

-- 4. Add column currency VARCHAR(10) NULL
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NULL;

-- 5. Add column payment_country_id INTEGER NULL REFERENCES countries(id)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_country_id INTEGER NULL;

-- Add FK constraint for payment_country_id separately to use IF NOT EXISTS for column
ALTER TABLE transactions
ADD CONSTRAINT IF NOT EXISTS fk_transactions_payment_country
FOREIGN KEY (payment_country_id) REFERENCES countries(id);

-- 6. Add column payment_method_type_id INTEGER NULL REFERENCES payment_methods(id)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_method_type_id INTEGER NULL;

-- Add FK constraint for payment_method_type_id separately
ALTER TABLE transactions
ADD CONSTRAINT IF NOT EXISTS fk_transactions_payment_method_type
FOREIGN KEY (payment_method_type_id) REFERENCES payment_methods(id);

-- 7. Add a table-level composite foreign key constraint
-- Drop it first if it might exist from a previous attempt (use a unique name)
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS fk_transactions_country_payment_method_config;
ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_country_payment_method_config
FOREIGN KEY (payment_country_id, payment_method_type_id)
REFERENCES country_payment_methods(country_id, payment_method_id);

-- 8. Modify the status column
-- Drop existing DEFAULT for status (if one exists directly on column)
ALTER TABLE transactions
ALTER COLUMN status DROP DEFAULT;

-- Drop existing CHECK constraint for status (assuming a common name, or it might require manual lookup)
-- Try a common name pattern. If this fails, the specific name needs to be found and used.
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_status_check;
-- If the above was an unnamed constraint tied directly, this might not work.
-- A more general way to remove an unnamed check constraint is harder without dynamic SQL.
-- For now, proceeding with assumption it's named or this is sufficient.

-- Set new DEFAULT value for status
ALTER TABLE transactions
ALTER COLUMN status SET DEFAULT 'pending_payment';

-- Add new CHECK constraint for status
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_status_new_check; -- Drop if exists from a previous run
ALTER TABLE transactions
ADD CONSTRAINT transactions_status_new_check
CHECK (status IN ('pending_payment', 'pending_verification', 'completed', 'declined', 'error'));

-- 9. Rename the existing type column to item_category (VARCHAR(50))
ALTER TABLE transactions
RENAME COLUMN type TO item_category;

-- Ensure the type is VARCHAR(50) if it wasn't already (RENAME doesn't change type)
-- The original 'type' column was likely text or varchar. Assuming it's compatible.
-- If it needs explicit type change:
-- ALTER TABLE transactions ALTER COLUMN item_category TYPE VARCHAR(50);
-- For now, assuming original type was suitable for rename and new check constraint.

-- 10. Modify the CHECK constraint on the (renamed) item_category column
-- Drop the old constraint (using the name provided in the prompt)
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_type_check; -- This was the old name for 'type'

-- Add a new check constraint for item_category
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_item_category_check; -- New name for the constraint
ALTER TABLE transactions
ADD CONSTRAINT transactions_item_category_check
CHECK (item_category IN ('subscription', 'gift')); -- Add other types as needed in future

-- Comments for clarity
COMMENT ON COLUMN transactions.user_provided_reference IS 'User-provided reference for the payment (e.g., M-Pesa transaction ID).';
COMMENT ON COLUMN transactions.admin_notes IS 'Notes added by an admin regarding this transaction.';
COMMENT ON COLUMN transactions.payable_item_id IS 'ID of the item being paid for (e.g., subscription_id, gift_id if specific tracking needed beyond item_category).';
COMMENT ON COLUMN transactions.currency IS 'Currency code for the transaction amount (e.g., USD, KES).';
COMMENT ON COLUMN transactions.payment_country_id IS 'Country where the payment is being made/processed.';
COMMENT ON COLUMN transactions.payment_method_type_id IS 'The global type of payment method used (e.g., MPESA, PAYPAL).';
COMMENT ON COLUMN transactions.item_category IS 'Category of the item being purchased (e.g., subscription, gift).';

COMMIT;

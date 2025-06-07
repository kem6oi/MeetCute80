ALTER TABLE user_gifts
ADD COLUMN is_redeemed BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN redeemed_at TIMESTAMP NULL,
ADD COLUMN original_purchase_price NUMERIC(10, 2) NULL,
ADD COLUMN redeemed_value NUMERIC(10, 2) NULL;

-- Add an index for is_redeemed if querying unredeemed gifts often
CREATE INDEX idx_user_gifts_is_redeemed ON user_gifts(is_redeemed);

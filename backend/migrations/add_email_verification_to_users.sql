-- Add is_email_verified and email_verification_token columns to users table
ALTER TABLE users
ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN email_verification_token VARCHAR(255) NULLABLE;

-- Add index on email_verification_token for faster lookups
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);

CREATE TABLE withdrawal_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- e.g., pending, approved, processed, declined
    user_payment_details TEXT NOT NULL, -- User provides details like PayPal email, bank info etc.
    admin_notes TEXT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at TIMESTAMP NULL,
    processed_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL -- Admin user who processed it
);

CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);

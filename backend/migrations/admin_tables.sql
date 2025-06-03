-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('subscription', 'gift')),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    bio TEXT,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reported_content table
CREATE TABLE IF NOT EXISTS reported_content (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('profile', 'photo', 'message', 'activity')),
    content_id INTEGER,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user_id ON admin_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_reported_content_type ON reported_content(type);
CREATE INDEX IF NOT EXISTS idx_reported_content_status ON reported_content(status);
CREATE INDEX IF NOT EXISTS idx_reported_content_reporter ON reported_content(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reported_content_reported_user ON reported_content(reported_user_id);

-- Insert some sample data for testing
INSERT INTO transactions (user_id, type, amount, status, created_at)
SELECT 
    u.id,
    CASE WHEN random() < 0.7 THEN 'subscription' ELSE 'gift' END,
    CASE 
        WHEN random() < 0.4 THEN 9.99
        WHEN random() < 0.7 THEN 19.99
        ELSE 29.99
    END,
    'completed',
    NOW() - (random() * interval '60 days')
FROM users u
WHERE u.role != 'admin'
LIMIT 100;

-- Update some user roles to premium
UPDATE users 
SET role = 'premium' 
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM transactions 
    WHERE type = 'subscription' 
    AND created_at >= NOW() - interval '30 days'
);

-- Insert sample reported content
INSERT INTO reported_content (reporter_id, reported_user_id, type, reason, status)
SELECT 
    u1.id as reporter_id,
    u2.id as reported_user_id,
    CASE floor(random() * 4)
        WHEN 0 THEN 'profile'
        WHEN 1 THEN 'photo'
        WHEN 2 THEN 'message'
        ELSE 'activity'
    END as type,
    CASE floor(random() * 4)
        WHEN 0 THEN 'Inappropriate content'
        WHEN 1 THEN 'Harassment'
        WHEN 2 THEN 'Spam'
        ELSE 'Suspicious behavior'
    END as reason,
    'pending' as status
FROM 
    users u1 
    CROSS JOIN users u2
WHERE 
    u1.id != u2.id 
    AND u1.role != 'admin' 
    AND u2.role != 'admin'
LIMIT 50; 
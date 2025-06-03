-- Create reported_content table
CREATE TABLE IF NOT EXISTS reported_content (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('profile', 'photo', 'message', 'activity')),
    content_id INTEGER,  -- References the specific content (message_id, photo_id, etc.)
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reported_content_type ON reported_content(type);
CREATE INDEX IF NOT EXISTS idx_reported_content_status ON reported_content(status);
CREATE INDEX IF NOT EXISTS idx_reported_content_reporter ON reported_content(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reported_content_reported_user ON reported_content(reported_user_id);

-- Insert some sample data
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
-- Create profile_views table for tracking profile views
CREATE TABLE IF NOT EXISTS profile_views (
  id SERIAL PRIMARY KEY,
  profile_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint to prevent multiple views per day from same viewer
ALTER TABLE profile_views
ADD CONSTRAINT profile_views_unique_daily
UNIQUE(profile_user_id, viewer_id, CAST(viewed_at AS DATE));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_user_id ON profile_views(profile_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON profile_views(viewed_at);

-- Insert some sample data for testing
INSERT INTO profile_views (profile_user_id, viewer_id, viewed_at)
SELECT 
    u1.id as profile_user_id,
    u2.id as viewer_id,
    NOW() - (random() * interval '30 days')
FROM 
    users u1 
    CROSS JOIN users u2
WHERE 
    u1.id != u2.id 
    AND u1.role != 'admin' 
    AND u2.role != 'admin'
LIMIT 200;

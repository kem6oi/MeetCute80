-- Add profile_picture column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255);

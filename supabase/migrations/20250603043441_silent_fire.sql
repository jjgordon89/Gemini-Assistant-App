/*
  # Create user_settings table

  1. New Tables
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (text, foreign key to auth.users)
      - `setting_name` (text)
      - `setting_value` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  2. Security
    - Enable RLS on `user_settings` table
    - Add policy for authenticated users to read/write their own settings
*/

-- Create the user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  setting_name text NOT NULL,
  setting_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Create a unique constraint for user_id and setting_name combination
  CONSTRAINT unique_user_setting UNIQUE(user_id, setting_name)
);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select their own settings
CREATE POLICY "Users can read own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Create policy to allow users to insert their own settings
CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Create policy to allow users to update their own settings
CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Create policy to allow users to delete their own settings
CREATE POLICY "Users can delete own settings"
  ON user_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
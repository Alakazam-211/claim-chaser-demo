-- Create voice_settings table to track if voice calling is enabled
CREATE TABLE IF NOT EXISTS voice_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial row with voice disabled
INSERT INTO voice_settings (enabled) VALUES (false) ON CONFLICT DO NOTHING;

-- Add updated_at trigger
CREATE TRIGGER update_voice_settings_updated_at BEFORE UPDATE ON voice_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE voice_settings ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on voice_settings" ON voice_settings
    FOR ALL USING (true) WITH CHECK (true);



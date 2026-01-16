-- Create demos table to track demo sessions
CREATE TABLE IF NOT EXISTS demos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_demos_email ON demos(email);
CREATE INDEX IF NOT EXISTS idx_demos_phone ON demos(phone);
CREATE INDEX IF NOT EXISTS idx_demos_created_at ON demos(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_demos_updated_at BEFORE UPDATE ON demos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE demos ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on demos" ON demos
    FOR ALL USING (true) WITH CHECK (true);


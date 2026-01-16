-- Create calls table to track phone calls
-- Note: If your claims table is named 'patients', change 'claims' to 'patients' below
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID, -- References claims(id) or patients(id) - adjust based on your schema
  conversation_id TEXT UNIQUE, -- ElevenLabs conversation ID
  call_sid TEXT, -- Twilio call SID
  status TEXT DEFAULT 'initiated', -- initiated, in_progress, completed, failed
  to_number TEXT NOT NULL,
  from_number TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  transcript JSONB, -- Full transcript data from ElevenLabs
  extracted_data JSONB, -- Extracted denial reasons, next steps, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calls_claim_id ON calls(claim_id);
CREATE INDEX IF NOT EXISTS idx_calls_conversation_id ON calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- Add updated_at trigger
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on calls" ON calls
    FOR ALL USING (true) WITH CHECK (true);


-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Offices table
CREATE TABLE offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  callback_number TEXT,
  ein TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doctors table
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  npi TEXT UNIQUE,
  office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Providers table
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  claims_phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients/Claims table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_name TEXT NOT NULL,
  insurance_provider TEXT NOT NULL,
  insurance_phone TEXT,
  patient_id TEXT,
  date_of_birth DATE,
  date_of_service DATE,
  billed_amount DECIMAL(10, 2),
  claim_status TEXT,
  denial_reasons TEXT[],
  next_steps TEXT,
  resubmission_instructions TEXT,
  office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table for uploaded files
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'excel' or 'text'
  file_url TEXT, -- Supabase storage URL
  content JSONB, -- Parsed Excel data or text content
  metadata JSONB, -- Additional metadata about the file
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Excel column mappings table
CREATE TABLE excel_column_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  excel_column TEXT NOT NULL,
  mapped_field TEXT NOT NULL, -- e.g., 'patient_name', 'insurance_provider', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_doctors_office_id ON doctors(office_id);
CREATE INDEX idx_providers_name ON providers(name);
CREATE INDEX idx_patients_office_id ON patients(office_id);
CREATE INDEX idx_patients_doctor_id ON patients(doctor_id);
CREATE INDEX idx_patients_insurance_provider ON patients(insurance_provider);
CREATE INDEX idx_patients_claim_status ON patients(claim_status);
CREATE INDEX idx_excel_column_mappings_document_id ON excel_column_mappings(document_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_offices_updated_at BEFORE UPDATE ON offices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_column_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - adjust based on your auth needs)
CREATE POLICY "Allow all operations on offices" ON offices
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on doctors" ON doctors
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on providers" ON providers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on patients" ON patients
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on documents" ON documents
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on excel_column_mappings" ON excel_column_mappings
    FOR ALL USING (true) WITH CHECK (true);


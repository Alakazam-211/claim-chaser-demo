# AI Claim Chaser Database

A Next.js web application for managing insurance claims, medical offices, doctors, and uploading data files for AI voice agent access.

## Tech Stack

- **Next.js 16+** (App Router)
- **TypeScript** (strict mode)
- **React 19**
- **Tailwind CSS 4+** (using @tailwindcss/postcss)
- **Supabase** (backend/database)
- **Framer Motion** (animations)

## Features

- **Offices Management**: Add, edit, and delete medical offices with address and contact information
- **Doctors Management**: Manage doctor profiles with NPI, EIN, and office associations
- **File Uploads**: 
  - Upload Excel files with column mapping for patient/claim data
  - Upload text documents for AI voice agent reference
- **Database**: Supabase PostgreSQL database with proper schema and relationships

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fwalufirlnvffvhctalf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YWx1ZmlybG52ZmZ2aGN0YWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTA0MzMsImV4cCI6MjA4MzM4NjQzM30.yb-417R0WqYvJq0o8cqsHOSoPGltvqXMbtABg0Mafac
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3004`

### 4. Database Schema

The database schema has been automatically applied to your Supabase project. It includes:

- **offices**: Medical office information
- **doctors**: Doctor profiles with NPI and EIN
- **patients**: Patient and claim information
- **documents**: Uploaded Excel and text files
- **excel_column_mappings**: Column mappings for Excel imports

## Project Structure

```
claim-chaser-web/
├── app/
│   ├── doctors/          # Doctors management page
│   ├── offices/          # Offices management page
│   ├── uploads/          # File upload page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/
│   ├── Navigation.tsx    # Main navigation
│   ├── OfficeForm.tsx    # Office add/edit form
│   ├── OfficeList.tsx    # Office list display
│   ├── DoctorForm.tsx    # Doctor add/edit form
│   └── DoctorList.tsx    # Doctor list display
├── lib/
│   └── supabase/
│       ├── client.ts     # Browser Supabase client
│       └── server.ts     # Server Supabase client
└── supabase-schema.sql   # Database schema
```

## Usage

### Managing Offices

1. Navigate to the "Offices" page
2. Click "Add Office" to create a new office
3. Fill in the office details (name, address, callback number)
4. Click "Save" to store the office

### Managing Doctors

1. Navigate to the "Doctors" page
2. Click "Add Doctor" to create a new doctor profile
3. Enter doctor name, NPI, and optionally associate with an office
4. Click "Save" to store the doctor

### Uploading Files

#### Excel Files

1. Navigate to the "Uploads" page
2. Select an Excel file (.xlsx or .xls)
3. The system will automatically detect columns
4. Map each Excel column to a database field:
   - Patient Name
   - Insurance Provider
   - Patient ID
   - Date of Birth
   - Date of Service
   - Billed Amount
   - etc.
5. Click "Upload Excel File" to save

#### Text Documents

1. Navigate to the "Uploads" page
2. Paste or type text content in the text area
3. Click "Upload Text Document" to save
4. This text will be accessible to the AI voice agent

## Database Schema Details

### Offices Table
- `id` (UUID, Primary Key)
- `name` (TEXT, Required)
- `address` (TEXT, Required)
- `city`, `state`, `zip_code` (TEXT, Optional)
- `callback_number` (TEXT, Optional)
- `ein` (TEXT, Optional)
- `created_at`, `updated_at` (Timestamps)

### Doctors Table
- `id` (UUID, Primary Key)
- `name` (TEXT, Required)
- `npi` (TEXT, Unique, Optional)
- `office_id` (UUID, Foreign Key to offices)
- `created_at`, `updated_at` (Timestamps)

### Patients Table
- `id` (UUID, Primary Key)
- `patient_name` (TEXT, Required)
- `insurance_provider` (TEXT, Required)
- `insurance_phone`, `patient_id` (TEXT, Optional)
- `date_of_birth`, `date_of_service` (DATE, Optional)
- `billed_amount` (DECIMAL, Optional)
- `claim_status` (TEXT, Optional)
- `denial_reasons` (TEXT[], Optional)
- `next_steps`, `resubmission_instructions` (TEXT, Optional)
- `office_id`, `doctor_id` (UUID, Foreign Keys)
- `created_at`, `updated_at` (Timestamps)

### Documents Table
- `id` (UUID, Primary Key)
- `file_name` (TEXT, Required)
- `file_type` (TEXT, Required: 'excel' or 'text')
- `file_url` (TEXT, Optional - for Supabase Storage)
- `content` (JSONB - parsed Excel data or text content)
- `metadata` (JSONB - file metadata)
- `created_at` (Timestamp)

## Color Scheme

- Primary: `#28361f`
- Secondary: `#BDE3FC`
- Background: `#F0F9FF`
- Dark: `#28361F`
- Accent: `#595115`

## Scripts

- `npm run dev` - Start development server on port 3004
- `npm run build` - Build for production
- `npm run start` - Start production server on port 3004
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Supabase Project

- **Project Name**: AI CLaim Chaser Database
- **Project ID**: fwalufirlnvffvhctalf
- **Region**: us-east-1
- **URL**: https://fwalufirlnvffvhctalf.supabase.co

## Next Steps

1. Set up authentication (if needed) - currently RLS policies allow all operations
2. Add patient/claim management UI
3. Integrate with AI voice agent system
4. Add file storage for uploaded Excel files
5. Implement data import from Excel to patients table

## License

ISC


# Quick Start Guide

## First Time Setup

1. **Navigate to the project directory:**
   ```bash
   cd "/Users/Baden/AI Projects/Claim Chaser Demo/claim-chaser-web"
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Verify environment variables:**
   The `.env.local` file should already be created with your Supabase credentials. If not, create it with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://zzbumulzhbvqqbpdzkni.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6YnVtdWx6aGJ2cXFicGR6a25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTQ1NDcsImV4cCI6MjA4MzM5MDU0N30.jzunrUkjsupY6XK3GXo7CS2bkdfCty0lOWbpBZHtpBg
   NEXT_PUBLIC_SITE_URL=https://app.claimchaser.ai
   NEXT_PUBLIC_APP_URL=https://app.claimchaser.ai
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3005` (demo runs on port 3005)

## Database Status

✅ **Supabase Project Created**: AI CLaim Chaser Database
✅ **Database Schema Applied**: All tables, indexes, and policies are set up
✅ **RLS Policies**: Currently set to allow all operations (adjust for production)

## Available Pages

- **Home** (`/`) - Dashboard with navigation cards
- **Offices** (`/offices`) - Manage medical offices
- **Doctors** (`/doctors`) - Manage doctor profiles
- **Uploads** (`/uploads`) - Upload Excel files and text documents

## Testing the Application

1. **Add an Office:**
   - Go to Offices page
   - Click "Add Office"
   - Fill in: Name, Address, and optionally City, State, ZIP, Callback Number
   - Click "Save"

2. **Add a Doctor:**
   - Go to Doctors page
   - Click "Add Doctor"
   - Fill in: Name, NPI, and optionally select an Office
   - Click "Save"

3. **Upload an Excel File:**
   - Go to Uploads page
   - Select an Excel file (.xlsx or .xls)
   - Map columns to database fields
   - Click "Upload Excel File"

4. **Upload Text:**
   - Go to Uploads page
   - Paste or type text content
   - Click "Upload Text Document"

## Troubleshooting

### Port Already in Use
If port 3004 is already in use, you can change it in `package.json`:
```json
"dev": "next dev -p 3005"
```

### Supabase Connection Issues
- Verify `.env.local` file exists and has correct values
- Check Supabase project status at: https://supabase.com/dashboard/project/zzbumulzhbvqqbpdzkni

### Type Errors
Run type checking:
```bash
npm run type-check
```

### Build Errors
Try cleaning and rebuilding:
```bash
rm -rf .next
npm run build
```

## Next Steps

1. Test all CRUD operations (Create, Read, Update, Delete)
2. Upload sample Excel files to test column mapping
3. Add authentication if needed
4. Customize RLS policies for production
5. Add patient/claim management UI
6. Integrate with AI voice agent system


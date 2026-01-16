'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import GeistButton from '@/components/GeistButton'

interface Office {
  id: string
  name: string
}

interface Doctor {
  id: string
  name: string
}

export default function UploadsPage() {
  const [uploading, setUploading] = useState(false)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({})
  const [excelData, setExcelData] = useState<any[]>([])
  const [excelColumns, setExcelColumns] = useState<string[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const supabase = createClient()

  // Fetch offices and doctors on component mount
  useEffect(() => {
    const fetchOfficesAndDoctors = async () => {
      try {
        const [officesResult, doctorsResult] = await Promise.all([
          supabase.from('offices').select('id, name').order('name'),
          supabase.from('doctors').select('id, name').order('name')
        ])
        
        if (officesResult.data) setOffices(officesResult.data)
        if (doctorsResult.data) setDoctors(doctorsResult.data)
      } catch (error) {
        console.error('Error fetching offices and doctors:', error)
      }
    }
    
    fetchOfficesAndDoctors()
  }, [supabase])

  const fieldOptions = [
    { value: 'patient_name', label: 'Patient Name' },
    { value: 'insurance_provider', label: 'Insurance Provider' },
    { value: 'insurance_phone', label: 'Insurance Phone' },
    { value: 'patient_id', label: 'Patient ID' },
    { value: 'date_of_birth', label: 'Date of Birth' },
    { value: 'date_of_service', label: 'Date of Service' },
    { value: 'length_of_service', label: 'Length of Service' },
    { value: 'billed_amount', label: 'Billed Amount' },
    { value: 'claim_status', label: 'Claim Status' },
    { value: 'claim_number', label: 'Claim Number' },
    { value: 'denial_reasons', label: 'Denial Reasons' },
    { value: 'next_steps', label: 'Next Steps' },
    { value: 'resubmission_instructions', label: 'Resubmission Instructions' },
    { value: 'office_name', label: 'Office Name' },
    { value: 'doctor_name', label: 'Doctor Name' },
    { value: 'additional_notes', label: 'Additional Notes' },
  ]

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setExcelFile(file)

    // Read Excel file
    const reader = new FileReader()
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convert to JSON - default behavior uses first row as headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        defval: '', 
        raw: false
      })
      
      // Get columns that sheet_to_json found from the data
      const columnsFromData = jsonData.length > 0 ? Object.keys(jsonData[0] as object) : []
      
      // Also read headers directly from the first row to catch any that sheet_to_json might have missed
      // (e.g., columns that are completely empty)
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
      const headersFromSheet: string[] = []
      
      // Read headers from the first row
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        const cell = worksheet[cellAddress]
        if (cell) {
          const headerValue = cell.w || cell.v || ''
          const columnName = headerValue.toString().trim()
          if (columnName) {
            headersFromSheet.push(columnName)
          }
        }
      }
      
      // Check for additional columns beyond the range
      for (let col = range.e.c + 1; col <= range.e.c + 20; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        const cell = worksheet[cellAddress]
        if (cell && (cell.w || cell.v)) {
          const headerValue = cell.w || cell.v || ''
          const columnName = headerValue.toString().trim()
          if (columnName) {
            headersFromSheet.push(columnName)
          }
        }
      }
      
      // Combine columns from both sources, prioritizing sheet_to_json's column names
      // (as they match the data keys) but including any additional ones from the sheet
      const allColumnsSet = new Set<string>()
      columnsFromData.forEach(col => allColumnsSet.add(col))
      headersFromSheet.forEach(col => allColumnsSet.add(col))
      const allColumns = Array.from(allColumnsSet)
      
      // Ensure all detected columns are present in data objects
      if (jsonData.length > 0) {
        jsonData.forEach((row: any) => {
          allColumns.forEach((col) => {
            if (!(col in row)) {
              row[col] = ''
            }
          })
        })
      }

      if (allColumns.length > 0) {
        setExcelColumns(allColumns)
        setExcelData(jsonData)
        
        // Auto-map common column names
        const autoMappings: Record<string, string> = {}
        allColumns.forEach((col) => {
          const lowerCol = col.toLowerCase()
          if (lowerCol.includes('patient') && lowerCol.includes('name')) {
            autoMappings[col] = 'patient_name'
          } else if (lowerCol.includes('insurance') && lowerCol.includes('provider')) {
            autoMappings[col] = 'insurance_provider'
          } else if (lowerCol.includes('patient') && lowerCol.includes('id')) {
            autoMappings[col] = 'patient_id'
          } else if (lowerCol.includes('date') && lowerCol.includes('birth')) {
            autoMappings[col] = 'date_of_birth'
          } else if (lowerCol.includes('date') && lowerCol.includes('service')) {
            autoMappings[col] = 'date_of_service'
          } else if (lowerCol.includes('length') && lowerCol.includes('service')) {
            autoMappings[col] = 'length_of_service'
          } else if (lowerCol.includes('billed') || lowerCol.includes('amount')) {
            autoMappings[col] = 'billed_amount'
          } else if (lowerCol.includes('claim') && lowerCol.includes('number')) {
            autoMappings[col] = 'claim_number'
          } else if (lowerCol.includes('claim') && lowerCol.includes('status')) {
            autoMappings[col] = 'claim_status'
          } else if (lowerCol.includes('status') && !lowerCol.includes('patient')) {
            autoMappings[col] = 'claim_status'
          } else if (lowerCol.includes('denial') && (lowerCol.includes('reason') || lowerCol.includes('code'))) {
            autoMappings[col] = 'denial_reasons'
          } else if (lowerCol.includes('denial')) {
            autoMappings[col] = 'denial_reasons'
          } else if (lowerCol.includes('office')) {
            autoMappings[col] = 'office_name'
          } else if (lowerCol.includes('doctor')) {
            autoMappings[col] = 'doctor_name'
          } else if (lowerCol.includes('additional') && lowerCol.includes('notes')) {
            autoMappings[col] = 'additional_notes'
          } else if (lowerCol.includes('notes') && !lowerCol.includes('denial')) {
            autoMappings[col] = 'additional_notes'
          } else if (lowerCol.includes('next') && (lowerCol.includes('step') || lowerCol.includes('action'))) {
            autoMappings[col] = 'next_steps'
          } else if (lowerCol.includes('resubmission') || (lowerCol.includes('resubmit') && lowerCol.includes('instruction'))) {
            autoMappings[col] = 'resubmission_instructions'
          }
        })
        setColumnMappings(autoMappings)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleExcelUpload = async () => {
    if (!excelFile || excelColumns.length === 0) {
      alert('Please select an Excel file')
      return
    }

    // Validate that required fields are mapped
    const requiredFields = ['patient_name', 'insurance_provider']
    const mappedFields = Object.values(columnMappings)
    const missingRequired = requiredFields.filter(field => !mappedFields.includes(field))
    
    if (missingRequired.length > 0) {
      alert(`Please map the following required fields: ${missingRequired.join(', ')}`)
      return
    }

    setUploading(true)
    try {
      // Valid claim fields based on the database schema
      const validClaimFields = [
        'patient_name', 'patient_id', 'date_of_birth', 'insurance_provider',
        'insurance_phone', 'date_of_service', 'length_of_service', 'billed_amount',
        'claim_status', 'claim_number', 'denial_reasons', 'next_steps',
        'resubmission_instructions', 'office_id', 'doctor_id', 'office_name', 'doctor_name'
      ]

      // Helper function to find office ID by name (case-insensitive)
      const findOfficeIdByName = (name: string): string | null => {
        if (!name) return null
        const normalizedName = name.trim().toLowerCase()
        const office = offices.find(o => o.name.toLowerCase() === normalizedName)
        return office?.id || null
      }

      // Helper function to find doctor ID by name (case-insensitive)
      const findDoctorIdByName = (name: string): string | null => {
        if (!name) return null
        const normalizedName = name.trim().toLowerCase()
        const doctor = doctors.find(d => d.name.toLowerCase() === normalizedName)
        return doctor?.id || null
      }

      // Transform Excel rows into claim objects using the column mappings
      const claimsToInsert = excelData.map((row: any, index: number) => {
        const claim: any = {}
        let officeName: string | null = null
        let doctorName: string | null = null
        
        // Map each Excel column to its corresponding claim field
        Object.entries(columnMappings).forEach(([excelColumn, claimField]) => {
          // Skip if field doesn't exist in the claims table (except office_name and doctor_name which we handle separately)
          if (!validClaimFields.includes(claimField)) {
            console.warn(`Skipping unknown field: ${claimField}`)
            return
          }
          
          const value = row[excelColumn]
          
          // Handle office_name and doctor_name separately - store for later matching
          if (claimField === 'office_name') {
            officeName = value ? String(value).trim() : null
            return
          }
          
          if (claimField === 'doctor_name') {
            doctorName = value ? String(value).trim() : null
            return
          }
          
          // Skip if no value and field is optional
          if (value === undefined || value === null || value === '') {
            // Only set null for optional fields
            if (claimField !== 'patient_name' && claimField !== 'insurance_provider') {
              claim[claimField] = null
            }
            return
          }
          
          // Handle different field types
          switch (claimField) {
            case 'billed_amount':
              // Convert to number, handle currency symbols and commas
              const numValue = typeof value === 'string' 
                ? parseFloat(value.replace(/[^0-9.-]/g, '')) 
                : parseFloat(value)
              claim[claimField] = isNaN(numValue) ? null : numValue
              break
              
            case 'denial_reasons':
              // Handle array - split by comma, semicolon, or newline if string
              if (Array.isArray(value)) {
                claim[claimField] = value.filter(v => v && v.trim())
              } else if (typeof value === 'string') {
                const reasons = value.split(/[,;\n]/).map(r => r.trim()).filter(r => r)
                claim[claimField] = reasons.length > 0 ? reasons : null
              } else {
                claim[claimField] = null
              }
              break
              
            case 'date_of_birth':
            case 'date_of_service':
              // Handle dates - parse as local date and format as YYYY-MM-DD
              let dateValue = null
              if (value) {
                const dateStr = String(value).trim()
                // First check if it's already in YYYY-MM-DD format
                const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
                if (isoMatch) {
                  dateValue = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
                } else {
                  // Try to parse the date as local date (not UTC)
                  const date = new Date(dateStr)
                  if (!isNaN(date.getTime())) {
                    // Format as YYYY-MM-DD using local date components to avoid timezone conversion
                    const year = date.getFullYear()
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const day = String(date.getDate()).padStart(2, '0')
                    dateValue = `${year}-${month}-${day}`
                  } else {
                    // If parsing fails, try to extract date parts from common formats
                    const dateMatch = dateStr.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/)
                    if (dateMatch) {
                      dateValue = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
                    }
                  }
                }
              }
              claim[claimField] = dateValue
              break
              
            case 'claim_status':
              // Handle claim status - set to "Denied" if empty
              const statusValue = value ? String(value).trim() : ''
              claim[claimField] = statusValue || null
              break
              
            default:
              // All other fields as strings
              claim[claimField] = value ? String(value).trim() : null
          }
        })
        
        // Match office name to office_id
        if (officeName) {
          const matchedOfficeId = findOfficeIdByName(officeName)
          if (matchedOfficeId) {
            claim.office_id = matchedOfficeId
          } else {
            console.warn(`Row ${index + 1}: Office "${officeName}" not found in database. Skipping office assignment.`)
          }
        }
        
        // Match doctor name to doctor_id
        if (doctorName) {
          const matchedDoctorId = findDoctorIdByName(doctorName)
          if (matchedDoctorId) {
            claim.doctor_id = matchedDoctorId
          } else {
            console.warn(`Row ${index + 1}: Doctor "${doctorName}" not found in database. Skipping doctor assignment.`)
          }
        }
        
        // Ensure required fields are present
        if (!claim.patient_name || !claim.insurance_provider) {
          throw new Error(`Row ${index + 1} missing required fields: patient_name or insurance_provider`)
        }
        
        // Set default status to "Denied" for uploaded claims if status is empty, null, or not set
        if (!claim.claim_status || (typeof claim.claim_status === 'string' && claim.claim_status.trim() === '')) {
          claim.claim_status = 'Denied'
        }
        
        return claim
      })

      // Log first claim for debugging
      if (claimsToInsert.length > 0) {
        console.log('Sample claim to insert:', JSON.stringify(claimsToInsert[0], null, 2))
      }

      // Insert all claims into the claims table
      const { data: insertedClaims, error: claimsError } = await supabase
        .from('claims')
        .insert(claimsToInsert)
        .select()

      if (claimsError) {
        console.error('Claims insert error details:', {
          message: claimsError.message,
          details: claimsError.details,
          hint: claimsError.hint,
          code: claimsError.code,
          fullError: claimsError
        })
        const errorMsg = claimsError.message || claimsError.details || claimsError.hint || JSON.stringify(claimsError)
        throw new Error(`Failed to create claims: ${errorMsg}`)
      }

      // Optionally save document metadata for reference
      const { data: documentData, error: docError } = await supabase
        .from('documents')
        .insert([
          {
            file_name: excelFile.name,
            file_type: 'excel',
            content: excelData,
            metadata: {
              columns: excelColumns,
              row_count: excelData.length,
              claims_created: insertedClaims?.length || 0,
              uploaded_at: new Date().toISOString(),
            },
          },
        ])
        .select()
        .single()

      // Don't fail if document save fails, but log it
      if (docError) {
        console.warn('Document metadata save error (non-critical):', docError)
      }

      // Save column mappings for reference
      if (documentData && Object.keys(columnMappings).length > 0) {
        const mappings = Object.entries(columnMappings).map(([excel_column, mapped_field]) => ({
          document_id: documentData.id,
          excel_column,
          mapped_field,
        }))

        const { error: mappingError } = await supabase
          .from('excel_column_mappings')
          .insert(mappings)

        if (mappingError) {
          console.warn('Mapping save error (non-critical):', mappingError)
        }
      }

      alert(`Successfully created ${insertedClaims?.length || 0} claim(s) from Excel file!`)
      setExcelFile(null)
      setExcelData([])
      setExcelColumns([])
      setColumnMappings({})
    } catch (error: any) {
      console.error('Error uploading Excel:', error)
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred'
      alert(`Failed to upload Excel file: ${errorMessage}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Uploads Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-dark">Uploads</h1>
        </div>

        {/* Excel Upload Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-dark mb-4">Upload Excel File</h2>
          <p className="text-dark/70 mb-4">
            Upload an Excel file with patient/claim information. Map columns to fields below.
          </p>

          <div className="mb-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelFileChange}
              className="block w-full text-sm text-dark file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:bg-[#1e7145] file:text-white file:text-sm file:font-bold hover:file:bg-[#165832] transition-all cursor-pointer bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e7145] focus:border-transparent"
            />
          </div>

          {excelColumns.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-dark">Column Mappings</h3>
              <p className="text-sm text-dark/70">
                Map each Excel column to a database field. Leave unmapped if not needed.
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {excelColumns.map((column) => (
                  <div key={column} className="flex items-center space-x-4">
                    <label className="w-48 text-sm font-medium text-dark">
                      {column}:
                    </label>
                    <select
                      value={columnMappings[column] || ''}
                      onChange={(e) =>
                        setColumnMappings({
                          ...columnMappings,
                          [column]: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e7145] focus:border-transparent"
                    >
                      <option value="">-- Not mapped --</option>
                      {fieldOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <GeistButton
                  variant="primary"
                  onClick={handleExcelUpload}
                  disabled={uploading}
                  className="bg-[#1e7145] text-white border-none"
                >
                  {uploading ? 'Uploading...' : 'Upload Excel File'}
                </GeistButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


# B2B Booking Module - Firestore Schema & Architecture

## Firestore Collections Structure

### 1. `companies` (Root Collection)

Top-level collection storing all B2B client companies.

```typescript
{
  id: string,                    // Auto-generated Firestore doc ID
  name: string,                  // Company Name
  contactPerson: string,         // Primary contact name
  phone: string,                 // Phone number
  email: string,                 // Email address
  address?: string,              // Optional address
  city?: string,                 // Optional city
  state?: string,                // Optional state
  zipCode?: string,              // Optional zip code
  createdAt: Timestamp,          // Creation date
  createdBy: string,             // Admin user ID
  updatedAt: Timestamp,          // Last update
  notes?: string,                // Internal notes
  isActive: boolean,             // Soft delete flag
}
```

---

### 2. `companies/{companyId}/services` (Subcollection)

Services performed for a specific company.

```typescript
{
  id: string,                    // Auto-generated doc ID
  companyId: string,             // Reference to parent company
  title: string,                 // Service title (e.g., "Car Wash")
  type: string,                  // Service type enum
  status: 'pending'|'completed'|'cancelled',  // Service status
  serviceDate: Timestamp,        // Date service was performed
  dateRangeStart?: Timestamp,    // Filter range start (for multi-date services)
  dateRangeEnd?: Timestamp,      // Filter range end
  totalAmount: number,           // Auto-calculated total = vehicles cost + referrals commission
  subtotal: number,              // Sum of vehicle costs
  referralTotal: number,         // Sum of referral commissions
  notes?: string,                // Service notes/description
  quotationId?: string,          // Reference to generated quotation doc
  invoiceId?: string,            // Reference to generated invoice doc
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string,
}
```

---

### 3. `companies/{companyId}/services/{serviceId}/vehicles` (Sub-subcollection)

Vehicles involved in a service (supports 1:many vehicles per service).

```typescript
{
  id: string,                    // Auto-generated doc ID
  serviceId: string,             // Reference to parent service
  plateNumber: string,           // Vehicle registration/plate number
  brand: string,                 // Vehicle brand (e.g., Toyota)
  model: string,                 // Model (e.g., Camry)
  year?: number,                 // Manufacturing year
  color?: string,                // Vehicle color
  notes?: string,                // Vehicle specific notes
  serviceCost: number,           // Cost for this vehicle
  status: 'pending'|'in-progress'|'completed'|'cancelled',
  
  // Summary fields (denormalized for easy display)
  preInspectionCount: number,    // Count of pre-inspections
  referralLinked?: string,       // ID of linked referral (if any)
  
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

---

### 4. `.../vehicles/{vehicleId}/preInspections` (Sub-sub-subcollection)

Pre-inspection records per vehicle (typically 1 per vehicle, but can support 2+ for follow-ups).

```typescript
{
  id: string,
  vehicleId: string,
  inspectionDate: Timestamp,
  
  // Media
  images: [
    {
      name: string,              // File name
      path: string,              // Storage path: companies/{companyId}/services/{serviceId}/vehicles/{vehicleId}/inspections/images/{name}
      uploadedAt: Timestamp,
    }
  ],
  videos: [
    {
      name: string,
      path: string,              // Storage path: companies/{companyId}/services/{serviceId}/vehicles/{vehicleId}/inspections/videos/{name}
      uploadedAt: Timestamp,
    }
  ],
  
  // Inspection data
  notes: string,                 // Detailed notes
  checklist: [
    {
      item: string,              // Checklist item (e.g., "Paint damage", "Dents")
      status: 'ok'|'issue'|'pending',
      remark?: string,           // Remarks for this item
    }
  ],
  
  inspectionType?: string,       // 'before' | 'after' | 'followup'
  inspectedBy?: string,          // User ID of inspector
  
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

---

### 5. `companies/{companyId}/services/{serviceId}/referrals` (Sub-subcollection)

Referral records (commission tracking per service).

```typescript
{
  id: string,
  serviceId: string,
  
  personName: string,            // Referral person's name
  contact: string,               // Phone or email
  commission: number,            // Commission amount for this service
  
  linkedVehicleId?: string,      // Link to specific vehicle (if applicable)
  referralDate: Timestamp,       // When referral was made
  
  notes?: string,
  status: 'pending'|'completed'|'cancelled',
  
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

---

## Firestore Indexes

Required composite/single-field indexes for efficient querying:

1. **`services` - Status & Date filtering**
   - Collection: `companies/{companyId}/services`
   - Fields: `status` (Ascending), `serviceDate` (Descending)

2. **`services` - Date range queries**
   - Collection: `companies/{companyId}/services`
   - Field: `serviceDate` (Descending)

3. **`vehicles` - Service status**
   - Collection: `companies/{companyId}/services/{serviceId}/vehicles`
   - Fields: `status` (Ascending), `createdAt` (Descending)

4. **`preInspections` - By date**
   - Collection: `.../vehicles/{vehicleId}/preInspections`
   - Field: `inspectionDate` (Descending)

---

## Storage Structure

Firebase Storage paths for media uploads:

```
carmantra-bucket/
├── companies/
│   └── {companyId}/
│       ├── logo/                    // Company logo
│       └── services/
│           └── {serviceId}/
│               ├── vehicles/
│               │   └── {vehicleId}/
│               │       ├── inspections/
│               │       │   ├── images/
│               │       │   │   └── {imageId}.jpg
│               │       │   └── videos/
│               │       │       └── {videoId}.mp4
│               │       └── extras/  // Other vehicle-related files
│               └── documents/       // Quotations, invoices
│                   ├── quotations/
│                   │   └── {quotationId}.pdf
│                   └── invoices/
│                       └── {invoiceId}.pdf
```

---

## Data Flow & Relationships

```
Company
├── Services (per company)
│   ├── Vehicles (per service)
│   │   └── Pre-Inspections (per vehicle)
│   │       ├── Images
│   │       └── Videos
│   └── Referrals (per service)
│
├── Quotations (derived from services)
└── Invoices (derived from services)
```

### Amount Calculations

- **Vehicle Service Cost**: Set manually when adding/editing vehicle
- **Referral Commission**: Set manually per referral record
- **Service Subtotal**: `sum(vehicles[].serviceCost)`
- **Referral Total**: `sum(referrals[].commission)`
- **Service Total**: `subtotal + referralTotal`

### Status Propagation

1. **Service Status** → Used in lists and filtering
2. **Vehicle Status** → Individual vehicle state
3. **Pre-Inspection Status** → Derived from existence of records
4. **Quotation** → Reads current service status and amounts
5. **Invoice** → Reads current service status and amounts

Final status change (Pending→Completed→Cancelled):
- Updates `services` record
- Automatically synced in quotation/invoice display (no denormalization needed)

---

## Firestore Rules (Security)

```
match /databases/{database}/documents {
  // Only authenticated admins can access B2B module
  match /companies/{companyId=**} {
    allow read, write: if request.auth != null && 
                          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
  }
}
```

---

## Performance Considerations

1. **Denormalization**: `preInspectionCount` in vehicles for fast UI rendering
2. **Pagination**: Services list queries with `.limit(20)` and cursor-based pagination
3. **Caching**: Client-side cache with React Query / SWR with 5-min stale time
4. **Totals**: Recalculate on client immediately; Server-side validation via Firestore triggers (optional)

---

## API Endpoints (Next.js)

- `POST /api/b2b/companies` - Create company
- `PUT /api/b2b/companies/{id}` - Update company
- `GET /api/b2b/companies/{id}/services` - List services
- `POST /api/b2b/services` - Create service
- `PUT /api/b2b/services/{id}` - Update service (status, amounts)
- `POST /api/b2b/vehicles` - Add vehicle to service
- `POST /api/b2b/preInspections` - Upload pre-inspection
- `POST /api/b2b/referrals` - Add referral
- `POST /api/b2b/quotations/generate` - Generate quotation
- `POST /api/b2b/invoices/generate` - Generate invoice

---

## Summary

- **Clean hierarchy**: Company → Service → Vehicles → Pre-Inspections
- **Flexible referrals**: Per-service commission tracking
- **Status-driven**: Reflects across quotes/invoices
- **Media-rich**: Images/videos per vehicle inspection
- **Scalable**: Subcollections allow unlimited scale per company
- **Non-breaking**: Separate from B2C modules

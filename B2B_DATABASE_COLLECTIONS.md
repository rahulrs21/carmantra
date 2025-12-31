# B2B Booking Module - Firestore Collections Structure

## Overview

The B2B Booking module uses a **flat collection structure** (NOT nested) for optimal performance and easy querying.

---

## Collections & Sub-Collections

### 1. **b2b-companies** (Root Collection)
**Purpose**: Store all B2B client companies

**Document Fields**:
```typescript
{
  id: string,                    // Auto-generated Firestore doc ID
  name: string,                  // Company name (required)
  contactPerson: string,         // Primary contact name
  phone: string,                 // Phone number
  email: string,                 // Email address
  address?: string,              // Optional address
  city?: string,                 // Optional city
  state?: string,                // Optional state
  zipCode?: string,              // Optional zip code
  createdAt: Timestamp,          // Creation date
  createdBy: string,             // Admin user ID who created
  updatedAt: Timestamp,          // Last update timestamp
  notes?: string,                // Internal notes
  isActive: boolean,             // Soft delete flag (true = active)
}
```

**Example Document**:
```
b2b-companies/company-id-123
{
  "name": "Premier Auto Services",
  "contactPerson": "John Doe",
  "phone": "+971501234567",
  "email": "john@premieraputo.ae",
  "address": "Dubai, UAE",
  "isActive": true,
  "createdAt": Timestamp(2025-01-15),
  "createdBy": "admin-user-001"
}
```

---

### 2. **b2b-services** (Root Collection)
**Purpose**: Store all services for all companies (flattened for easy querying)

**Document Fields**:
```typescript
{
  id: string,                    // Auto-generated Firestore doc ID
  companyId: string,             // Reference to parent company (REQUIRED - use in where clause)
  title: string,                 // Service title (e.g., "Car Wash", "Ceramic Coating")
  type: string,                  // Service type (car-wash, detailing, ppf, ceramic-coating, tinting, polishing, pre-inspection, custom)
  status: 'pending' | 'completed' | 'cancelled', // Service status
  serviceDate: Timestamp,        // Date service was performed (REQUIRED)
  dateRangeStart?: Timestamp,    // Optional: Filter range start
  dateRangeEnd?: Timestamp,      // Optional: Filter range end
  totalAmount: number,           // Auto-calculated total = subtotal + referralTotal
  subtotal: number,              // Sum of vehicle costs
  referralTotal: number,         // Sum of referral commissions
  notes?: string,                // Service notes/description
  quotationId?: string,          // Reference to generated quotation doc
  createdAt: Timestamp,          // Creation date
  createdBy: string,             // Admin user ID
  updatedAt: Timestamp,          // Last update timestamp
}
```

**Example Document**:
```
b2b-services/service-id-456
{
  "companyId": "company-id-123",
  "title": "Full Car Wash & Ceramic Coating",
  "type": "ceramic-coating",
  "status": "completed",
  "serviceDate": Timestamp(2025-01-20),
  "dateRangeStart": Timestamp(2025-01-18),
  "dateRangeEnd": Timestamp(2025-01-22),
  "subtotal": 1500.00,
  "referralTotal": 200.00,
  "totalAmount": 1700.00,
  "notes": "Premium ceramic coating applied",
  "createdAt": Timestamp(2025-01-15),
  "createdBy": "admin-user-001"
}
```

**Important**: To fetch services for a company, use:
```typescript
const q = query(
  collection(db, 'b2b-services'),
  where('companyId', '==', companyId)
);
```

---

### 3. **b2b-vehicles** (Root Collection)
**Purpose**: Store all vehicles associated with services (flattened for easy querying)

**Document Fields**:
```typescript
{
  id: string,                       // Auto-generated doc ID
  companyId: string,                // Reference to company (REQUIRED for filtering)
  serviceId: string,                // Reference to service (REQUIRED for filtering)
  vehicleBrand: string,             // Brand/Make (e.g., Toyota)
  modelName: string,                // Model name (e.g., Camry)
  year?: number,                    // Manufacturing year
  fuelType?: string,                // Fuel type (Petrol, Diesel, Hybrid, Electric)
  color?: string,                   // Vehicle color
  vin?: string,                     // Vehicle Identification Number
  numberPlate: string,              // License plate
  status: 'active' | 'completed' | 'pending', // Vehicle status
  costAmount: number,               // Cost for this vehicle in the service
  preInspectionCount: number,       // Number of pre-inspections
  createdAt: Timestamp,             // Creation date
  createdBy: string,                // Admin user ID
  updatedAt: Timestamp,             // Last update timestamp
}
```

**Example Document**:
```
b2b-vehicles/vehicle-id-789
{
  "companyId": "company-id-123",
  "serviceId": "service-id-456",
  "vehicleBrand": "Toyota",
  "modelName": "Camry",
  "year": 2023,
  "fuelType": "Petrol",
  "color": "Silver",
  "vin": "VIN123456789",
  "numberPlate": "ABC 123",
  "status": "completed",
  "costAmount": 1500.00,
  "preInspectionCount": 1,
  "createdAt": Timestamp(2025-01-15),
  "createdBy": "admin-user-001"
}
```

**Querying**:
```typescript
// Get vehicles for a service
const q = query(
  collection(db, 'b2b-vehicles'),
  where('serviceId', '==', serviceId),
  where('companyId', '==', companyId)
);
```

---

### 4. **b2b-pre-inspections** (Root Collection)
**Purpose**: Store pre-inspection records for vehicles (flattened for easy querying)

**Document Fields**:
```typescript
{
  id: string,                       // Auto-generated doc ID
  companyId: string,                // Reference to company
  serviceId: string,                // Reference to service
  vehicleId: string,                // Reference to vehicle (REQUIRED for filtering)
  message: string,                  // Inspection notes/message
  status: 'pending' | 'completed' | 'in-progress', // Inspection status
  images: Array<{                   // Images uploaded
    url: string,                    // Firebase Storage URL
    timestamp: Timestamp            // Upload time
  }>,
  videos: Array<{                   // Videos uploaded
    url: string,                    // Firebase Storage URL
    timestamp: Timestamp            // Upload time
  }>,
  createdAt: Timestamp,             // Creation date
  createdBy: string,                // Admin user ID
  updatedAt: Timestamp,             // Last update timestamp
}
```

**Example Document**:
```
b2b-pre-inspections/inspection-id-999
{
  "companyId": "company-id-123",
  "serviceId": "service-id-456",
  "vehicleId": "vehicle-id-789",
  "message": "Vehicle condition good. No major issues found.",
  "status": "completed",
  "images": [
    {"url": "gs://...", "timestamp": Timestamp(2025-01-20)},
    {"url": "gs://...", "timestamp": Timestamp(2025-01-20)}
  ],
  "videos": [],
  "createdAt": Timestamp(2025-01-15),
  "createdBy": "admin-user-001"
}
```

---

### 5. **b2b-referrals** (Root Collection)
**Purpose**: Store referral information for services (flattened for easy querying)

**Document Fields**:
```typescript
{
  id: string,                       // Auto-generated doc ID
  companyId: string,                // Reference to company
  serviceId: string,                // Reference to service (REQUIRED for filtering)
  vehicleId?: string,               // Optional reference to vehicle
  referralContact: string,          // Name of referral contact person
  phone?: string,                   // Contact phone number
  email?: string,                   // Contact email
  commissionPercentage: number,     // Commission % (e.g., 10 for 10%)
  commissionAmount: number,         // Calculated commission amount
  status: 'pending' | 'paid' | 'cancelled', // Payment status
  createdAt: Timestamp,             // Creation date
  createdBy: string,                // Admin user ID
  updatedAt: Timestamp,             // Last update timestamp
}
```

**Example Document**:
```
b2b-referrals/referral-id-111
{
  "companyId": "company-id-123",
  "serviceId": "service-id-456",
  "vehicleId": "vehicle-id-789",
  "referralContact": "Ahmed Al-Mansoori",
  "phone": "+971505555555",
  "email": "ahmed@example.ae",
  "commissionPercentage": 10,
  "commissionAmount": 150.00,
  "status": "pending",
  "createdAt": Timestamp(2025-01-15),
  "createdBy": "admin-user-001"
}
```

**Querying**:
```typescript
// Get referrals for a service
const q = query(
  collection(db, 'b2b-referrals'),
  where('serviceId', '==', serviceId),
  where('companyId', '==', companyId)
);
```

---

## Firestore Security Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check admin role
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // B2B Collections - admin-only access
    match /b2b-companies/{docId=**} {
      allow read, write: if isAdmin();
    }

    match /b2b-services/{docId=**} {
      allow read, write: if isAdmin();
    }

    match /b2b-vehicles/{docId=**} {
      allow read, write: if isAdmin();
    }

    match /b2b-pre-inspections/{docId=**} {
      allow read, write: if isAdmin();
    }

    match /b2b-referrals/{docId=**} {
      allow read, write: if isAdmin();
    }

    // ... rest of your rules
  }
}
```

---

## Data Relationships

```
b2b-companies (Root)
│
├─→ b2b-services (companyId reference)
│   │
│   ├─→ b2b-vehicles (serviceId + companyId reference)
│   │   │
│   │   └─→ b2b-pre-inspections (vehicleId + serviceId + companyId reference)
│   │
│   └─→ b2b-referrals (serviceId + companyId reference)
│
```

---

## Firestore Indexes Required

### Index 1: b2b-services
```
Collection: b2b-services
Fields: 
  - companyId (Ascending)
  - serviceDate (Descending)
```

### Index 2: b2b-vehicles
```
Collection: b2b-vehicles
Fields:
  - serviceId (Ascending)
  - companyId (Ascending)
```

### Index 3: b2b-referrals
```
Collection: b2b-referrals
Fields:
  - serviceId (Ascending)
  - companyId (Ascending)
```

These indexes are **automatically created** when you run your first query. Monitor them in Firebase Console → Firestore → Indexes.

---

## Collection Size Recommendations

| Collection | Expected Documents | Retention |
|-----------|-------------------|-----------|
| b2b-companies | 10-100 | Indefinite (soft delete) |
| b2b-services | 1,000-10,000 | 2-3 years |
| b2b-vehicles | 5,000-50,000 | 2-3 years |
| b2b-pre-inspections | 10,000-100,000 | 1-2 years |
| b2b-referrals | 2,000-20,000 | 1-2 years |

---

## Cost Optimization

### Flat Structure Benefits
- ✅ No nested collection queries (saves quota)
- ✅ Faster queries with single where() clause
- ✅ Easier pagination and filtering
- ✅ Simple to manage and backup

### Query Optimization
```typescript
// Good ✅ - Single collection, filtered by companyId
const q = query(
  collection(db, 'b2b-services'),
  where('companyId', '==', companyId),
  limit(20)
);

// Avoid ❌ - Would require composite index
const q = query(
  collection(db, 'b2b-services'),
  where('companyId', '==', companyId),
  where('status', '==', 'completed'),
  where('serviceDate', '>=', startDate),
  orderBy('serviceDate', 'desc')
);

// Instead, fetch and filter client-side
const services = await getDocs(query(
  collection(db, 'b2b-services'),
  where('companyId', '==', companyId)
));
// Then filter in JavaScript
const filtered = services
  .filter(s => s.status === 'completed' && s.serviceDate >= startDate)
  .sort((a, b) => b.serviceDate - a.serviceDate);
```

---

## Summary

The B2B module uses **5 main collections**:
1. **b2b-companies** - Client companies
2. **b2b-services** - Services with amounts
3. **b2b-vehicles** - Vehicles in services
4. **b2b-pre-inspections** - Vehicle inspections
5. **b2b-referrals** - Referral commissions

All relationships are maintained through **reference fields** (companyId, serviceId, vehicleId) rather than nested collections for optimal performance.

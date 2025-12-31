# B2B Booking Module - Implementation & Testing Guide

## Quick Start

### 1. Verify Dependencies

Ensure these packages are installed in `package.json`:

```json
{
  "dependencies": {
    "firebase": "^10.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.0.0",
    "@hookform/resolvers": "^3.0.0"
  }
}
```

Install if missing:
```bash
npm install @tanstack/react-query react-hook-form zod @hookform/resolvers
```

### 2. Firestore Setup

#### Create Collections

1. Create `companies` root collection
2. For each company, create `services` subcollection
3. For each service, create:
   - `vehicles` subcollection
   - `referrals` subcollection
4. For each vehicle, create `preInspections` subcollection

#### Create Indexes

Navigate to Firestore Console → Indexes and create:

1. **Collection**: `companies/{companyId}/services`
   - Fields: `status` (Asc), `serviceDate` (Desc)
   
2. **Collection**: `companies/{companyId}/services`
   - Field: `serviceDate` (Desc)

### 3. Environment Setup

Add Firebase credentials to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Access Control

Ensure `firestore.rules` includes:

```firestore
match /companies/{companyId=**} {
  allow read, write: if request.auth != null && 
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

---

## Module Files Reference

### Type Definitions

**File**: [lib/types/b2b.types.ts](lib/types/b2b.types.ts)

Provides TypeScript interfaces for:
- `B2BCompany`
- `B2BService` (with `ServiceStatus` enum)
- `B2BVehicle` (with `VehicleStatus` enum)
- `B2BPreInspection` (with media and checklist)
- `B2BReferral`
- `B2BQuotation` (for future use)
- `B2BInvoice` (for future use)
- Form data types

### Firestore Service Layer

**File**: [lib/firestore/b2b-service.ts](lib/firestore/b2b-service.ts)

Exports service objects:
- `companiesService.fetchCompanies()`, `.fetchCompanyById()`, `.createCompany()`, `.updateCompany()`, `.deleteCompany()`
- `servicesService.fetchServices()`, `.fetchServiceById()`, `.createService()`, `.updateService()`, `.updateServiceStatus()`, `.recalculateServiceTotals()`
- `vehiclesService.fetchVehicles()`, `.addVehicle()`, `.updateVehicle()`, `.updatePreInspectionCount()`
- `preInspectionsService.fetchPreInspections()`, `.createPreInspection()`, `.updatePreInspection()`
- `referralsService.fetchReferrals()`, `.addReferral()`, `.updateReferral()`, `.deleteReferral()`

### Custom Hooks

**File**: [hooks/useB2B.ts](hooks/useB2B.ts)

Provides React Query hooks for:
- `useCompanies()` - List with pagination
- `useCompanyById()` - Single company
- `useCreateCompany()` - Mutation
- `useUpdateCompany()` - Mutation
- `useDeleteCompany()` - Mutation
- `useServices()` - List with date filter
- `useServiceById()` - Single service
- `useCreateService()` - Mutation
- `useUpdateService()` - Mutation
- `useUpdateServiceStatus()` - Mutation
- `useVehicles()` - List
- `useAddVehicle()` - Mutation
- `useUpdateVehicle()` - Mutation
- `usePreInspections()` - List
- `useCreatePreInspection()` - Mutation (with file uploads)
- `useReferrals()` - List
- `useAddReferral()` - Mutation
- `useUpdateReferral()` - Mutation
- `useDeleteReferral()` - Mutation
- `useCalculateTotals()` - Compute subtotal/total
- `useDateRangeDisplay()` - Format dates

### Page Components

| File | Route | Purpose |
|------|-------|---------|
| [app/admin/b2b-booking/page.tsx](app/admin/b2b-booking/page.tsx) | `/admin/b2b-booking` | Company list page |
| [app/admin/b2b-booking/companies/[id]/page.tsx](app/admin/b2b-booking/companies/[id]/page.tsx) | `/admin/b2b-booking/companies/{id}` | Company detail + services |
| [app/admin/b2b-booking/companies/[id]/services/[serviceId]/page.tsx](app/admin/b2b-booking/companies/[id]/services/[serviceId]/page.tsx) | `/admin/b2b-booking/companies/{id}/services/{serviceId}` | Service detail + vehicles + referrals |
| [app/admin/b2b-booking/companies/[id]/services/[serviceId]/vehicles/[vehicleId]/page.tsx](app/admin/b2b-booking/companies/[id]/services/[serviceId]/vehicles/[vehicleId]/page.tsx) | `/admin/b2b-booking/companies/{id}/services/{serviceId}/vehicles/{vehicleId}` | Vehicle detail + inspections |

### UI Components

**Location**: [components/admin/b2b/](components/admin/b2b/)

| Component | Responsibility |
|-----------|-----------------|
| `CompanyForm.tsx` | Modal form to create/edit company |
| `CompanyList.tsx` | Table + search + delete companies |
| `ServiceForm.tsx` | Modal form to create service |
| `ServiceList.tsx` | Table of services with actions |
| `VehicleForm.tsx` | Modal form to add vehicle |
| `VehicleList.tsx` | Table of vehicles |
| `ReferralForm.tsx` | Modal form to add referral |
| `ReferralList.tsx` | Table of referrals + totals |
| `PreInspectionForm.tsx` | Modal form with file uploads |
| `PreInspectionList.tsx` | Display inspection records |

---

## Testing Guide

### 1. Manual Testing Checklist

#### Company Management

- [ ] Create company with all fields
- [ ] Create company with minimal fields (required only)
- [ ] Edit company (update contact, address)
- [ ] View company list
- [ ] Search companies by name/email/contact
- [ ] Delete company (soft delete - check isActive flag)
- [ ] Verify created date shows correctly

#### Service Management

- [ ] Create service for a company
- [ ] View service list for company
- [ ] Update service status (pending → completed)
- [ ] Cancel service
- [ ] View service details
- [ ] Check totals display

#### Vehicle Management

- [ ] Add single vehicle to service
- [ ] Add multiple vehicles to one service
- [ ] Update vehicle cost (verify parent service total recalculates)
- [ ] Delete vehicle (removes from list)
- [ ] View vehicle details
- [ ] Check pre-inspection counter

#### Pre-Inspection

- [ ] Add pre-inspection with notes only
- [ ] Upload single image
- [ ] Upload multiple images
- [ ] Upload video
- [ ] Upload images + videos together
- [ ] Fill and save checklist
- [ ] Verify pre-inspection appears in vehicle list
- [ ] Counter increments in vehicle table

#### Referral Management

- [ ] Add referral with commission
- [ ] Link referral to vehicle (optional)
- [ ] Verify referral total updates parent service
- [ ] Delete referral
- [ ] Check total recalculates

#### Navigation

- [ ] Back buttons work at each level
- [ ] Breadcrumb trail is clear
- [ ] URL updates correctly
- [ ] Can go back and re-navigate

### 2. Automated Testing Examples

#### Unit Test: Calculate Totals

```typescript
import { useCalculateTotals } from '@/hooks/useB2B';

describe('useCalculateTotals', () => {
  it('calculates subtotal correctly', () => {
    const vehicles = [
      { serviceCost: 1000 },
      { serviceCost: 2000 },
    ];
    const referrals = [{ commission: 500 }];
    
    const { subtotal, referralTotal, totalAmount } = 
      useCalculateTotals(vehicles, referrals);
    
    expect(subtotal).toBe(3000);
    expect(referralTotal).toBe(500);
    expect(totalAmount).toBe(3500);
  });
});
```

#### Integration Test: Create Service

```typescript
import { companiesService, servicesService } from '@/lib/firestore/b2b-service';

describe('Service Creation', () => {
  it('creates service and updates company', async () => {
    // Create company
    const { id: companyId } = await companiesService.createCompany(
      { name: 'Test Co' },
      'admin-user-id'
    );
    
    // Create service
    const { service } = await servicesService.createService(
      companyId,
      { title: 'Car Wash', serviceDate: new Date() },
      'admin-user-id'
    );
    
    // Verify
    expect(service.companyId).toBe(companyId);
    expect(service.status).toBe('pending');
    expect(service.totalAmount).toBe(0); // No vehicles yet
  });
});
```

### 3. Firestore Testing (Use Emulator)

Set up Firebase Emulator for local testing:

```bash
firebase emulators:start
```

Configure in your test setup:
```typescript
import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

if (process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

### 4. Performance Testing

#### Monitor Firestore Reads

Check Firestore Console → Insights:
- Should see minimal reads due to caching
- Stale-time of 3-5 minutes reduces refetches
- Pagination limits reads

#### Monitor Storage Uploads

Use Firebase Console → Storage:
- Verify file structure matches pattern
- Check file sizes
- Monitor upload bandwidth

### 5. Error Scenarios

Test these scenarios:

1. **Network Error**: Disconnect internet while submitting form
   - Should show error message
   - Allow retry

2. **Validation Error**: Submit form with invalid email
   - Should show inline error
   - Prevent submission

3. **Permission Error**: Non-admin user tries to create company
   - Should show "Permission denied"

4. **Quota Error**: Upload large video file
   - Should show appropriate error
   - Not crash app

5. **Concurrent Edit**: Two users edit same company
   - Last write wins (Firestore default)
   - UI should refresh with latest data

---

## Common Issues & Solutions

### Issue: Pre-inspection images not appearing

**Cause**: Storage path incorrect or permissions denied

**Solution**:
```typescript
// Verify path pattern:
companies/{companyId}/services/{serviceId}/vehicles/{vehicleId}/inspections/images/{fileName}

// Check storage rules:
match /companies/{companyId}/services/{serviceId}/vehicles/{vehicleId}/inspections/{allPaths=**} {
  allow read, write: if request.auth != null && isAdmin();
}
```

### Issue: Service totals not recalculating

**Cause**: React Query cache not invalidating

**Solution**:
```typescript
// In mutation onSuccess:
queryClient.invalidateQueries({
  queryKey: ['b2b:service', companyId, serviceId]
});
```

### Issue: Slow page load for company with many services

**Cause**: Loading all services at once

**Solution**: Implement pagination
```typescript
const { services, hasMore, loadMore } = useServices(
  companyId,
  undefined,
  undefined,
  10  // Limit to 10 per page
);
```

### Issue: Form fields not pre-populating in edit mode

**Cause**: Default values not set correctly

**Solution**:
```typescript
const form = useForm({
  defaultValues: company ? {
    name: company.name,
    contactPerson: company.contactPerson,
    // ... etc
  } : { ... }
});
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Update Firestore security rules
- [ ] Create all required Firestore indexes
- [ ] Set up Cloud Storage with correct folder structure
- [ ] Configure CORS for Storage if needed
- [ ] Test with production Firebase project
- [ ] Verify environment variables set correctly
- [ ] Test on mobile devices
- [ ] Performance test with large datasets
- [ ] Set up monitoring/error tracking (Sentry, etc.)
- [ ] Create admin user accounts
- [ ] Document for team

---

## Future Integration Points

### Quotation Generation

File placeholder: `components/admin/b2b/QuotationGenerator.tsx`

Should:
1. Fetch service data
2. Fetch all vehicles for service
3. Fetch all referrals
4. Generate quotation document
5. Store in `companies/{companyId}/quotations/{quotationId}`

### Invoice Generation

File placeholder: `components/admin/b2b/InvoiceGenerator.tsx`

Should:
1. Convert quotation to invoice
2. Add payment terms
3. Track payment status
4. Generate PDF for download

### Analytics

Dashboard route: `/admin/b2b-booking/analytics`

Should show:
- Total companies
- Total services (grouped by status)
- Revenue by company
- Commission tracking
- Pre-inspection completion rates

---

## Support & Documentation

- **Schema Documentation**: See [B2B_BOOKING_SCHEMA.md](B2B_BOOKING_SCHEMA.md)
- **Data Flow**: See [B2B_DATA_FLOW_AND_STATE.md](B2B_DATA_FLOW_AND_STATE.md)
- **Type Definitions**: See [lib/types/b2b.types.ts](lib/types/b2b.types.ts)
- **API Reference**: See [lib/firestore/b2b-service.ts](lib/firestore/b2b-service.ts)


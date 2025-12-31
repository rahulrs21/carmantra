# B2B Booking Module - Data Flow & State Management

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [State Management Approach](#state-management-approach)
3. [Data Fetching & Caching](#data-fetching--caching)
4. [Mutations & Updates](#mutations--updates)
5. [Component Structure](#component-structure)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Admin UX Considerations](#admin-ux-considerations)
8. [Mobile Responsiveness](#mobile-responsiveness)
9. [Error Handling](#error-handling)

---

## Architecture Overview

### Technology Stack

- **Frontend**: Next.js 14+ (React 18+)
- **State Management**: React Query v5 (server-side state) + React Hook Form (form state)
- **Database**: Firebase Firestore (subcollections)
- **Storage**: Firebase Cloud Storage (media uploads)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Form Validation**: Zod + react-hook-form

### Data Hierarchy

```
┌─────────────────────────────────────────────────────┐
│ Companies (Root Collection)                         │
├─────────────────────────────────────────────────────┤
│  ├─ /companies/{companyId}                          │
│  │  ├─ /services                    (Subcollection) │
│  │  │  ├─ /services/{serviceId}                     │
│  │  │  │  ├─ /vehicles             (Sub-sub-col)   │
│  │  │  │  │  ├─ /vehicles/{vehicleId}              │
│  │  │  │  │  │  └─ /preInspections (Sub-sub-sub)   │
│  │  │  │  │  │     └─ /preInspections/{inspId}     │
│  │  │  │  │                                          │
│  │  │  │  └─ /referrals            (Sub-sub-col)   │
│  │  │  │     └─ /referrals/{referralId}            │
│  │  │                                                │
│  │  └─ Metadata (name, contact, address)           │
│  │                                                   │
│  └─ Denormalized: quotations, invoices (optional)  │
└─────────────────────────────────────────────────────┘
```

---

## State Management Approach

### Client-Side State

#### 1. **React Query** (Server State)
Primary source of truth for all data from Firestore.

```typescript
// Example: Fetching companies
const { data, isLoading, error } = useQuery({
  queryKey: ['b2b:companies', pageSize],
  queryFn: () => companiesService.fetchCompanies(pageSize),
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
});
```

**Stale Time Configuration:**
- **Companies list**: 5 minutes
- **Services list**: 3 minutes
- **Vehicles/Referrals**: 3 minutes
- **Pre-Inspections**: 3 minutes

#### 2. **React Hook Form** (Form State)
Handles form input, validation, and submission state.

```typescript
const form = useForm({
  resolver: zodResolver(companySchema),
  defaultValues: { ... }
});
```

#### 3. **Local Component State** (UI State)
Dialog open/close, loading indicators, file uploads.

```typescript
const [open, setOpen] = useState(false);
const [images, setImages] = useState<File[]>([]);
const [uploading, setUploading] = useState(false);
```

### State Flow Diagram

```
User Action (Click Form)
        ↓
Dialog Opens (Local State)
        ↓
Form Submission (React Hook Form)
        ↓
Validation (Zod)
        ↓
Firestore Mutation (useMutation)
        ↓
Optimistic Update (optional)
        ↓
React Query Invalidation
        ↓
Auto-refetch from Firestore
        ↓
UI Update (React re-render)
```

---

## Data Fetching & Caching

### Fetch Hooks Structure

All data access is abstracted through custom hooks in [hooks/useB2B.ts](hooks/useB2B.ts).

#### Company Fetching

```typescript
// List companies with pagination
const { companies, hasMore, isLoading, loadMore } = useCompanies(pageSize);

// Get single company
const { data: company } = useCompanyById(companyId);
```

#### Service Fetching

```typescript
// List services with optional date range filter
const { services, hasMore } = useServices(
  companyId,
  startDate,  // optional
  endDate,    // optional
  pageSize
);

// Get single service
const { data: service } = useServiceById(companyId, serviceId);
```

#### Nested Resource Fetching

```typescript
// Vehicles for a service
const { vehicles, isLoading } = useVehicles(companyId, serviceId);

// Pre-inspections for a vehicle
const { preInspections, isLoading } = usePreInspections(
  companyId,
  serviceId,
  vehicleId
);

// Referrals for a service
const { referrals, isLoading } = useReferrals(companyId, serviceId);
```

### Cache Invalidation Strategy

Mutations automatically invalidate relevant cache keys:

```typescript
// When vehicle is added, invalidate:
// 1. Vehicles list for this service
// 2. Parent service (to recalculate totals)
queryClient.invalidateQueries({
  queryKey: ['b2b:vehicles', companyId, serviceId]
});
queryClient.invalidateQueries({
  queryKey: ['b2b:service', companyId, serviceId]
});
```

---

## Mutations & Updates

### Create Operations

```typescript
// 1. Create Company
const createCompany = useCreateCompany();
await createCompany.mutateAsync({
  data: { name, contactPerson, ... },
  userId: currentUser.id
});

// 2. Create Service
const createService = useCreateService();
await createService.mutateAsync({
  companyId,
  data: { title, type, serviceDate, ... },
  userId: currentUser.id
});

// 3. Add Vehicle
const addVehicle = useAddVehicle();
await addVehicle.mutateAsync({
  companyId,
  serviceId,
  data: { plateNumber, brand, serviceCost, ... }
});

// 4. Add Pre-Inspection (with file uploads)
const createPreInspection = useCreatePreInspection();
// First upload files to Firebase Storage
// Then create pre-inspection record with storage paths
```

### Update Operations

```typescript
// Update service status
const updateServiceStatus = useUpdateServiceStatus();
await updateServiceStatus.mutateAsync({
  companyId,
  serviceId,
  status: 'completed'
});

// Update vehicle cost (triggers parent recalculation)
const updateVehicle = useUpdateVehicle();
await updateVehicle.mutateAsync({
  companyId,
  serviceId,
  vehicleId,
  data: { serviceCost: 5000 }
});
```

### Amount Recalculation Flow

```
Vehicle Cost Updated
        ↓
useUpdateVehicle() mutation
        ↓
Firestore: Update vehicles/{vehicleId}.serviceCost
        ↓
Client invalidates: ['b2b:vehicles', companyId, serviceId]
        ↓
Client invalidates: ['b2b:service', companyId, serviceId]
        ↓
Re-fetch service record
        ↓
useCalculateTotals() hook computes:
  subtotal = sum(vehicles[].serviceCost)
  referralTotal = sum(referrals[].commission)
  totalAmount = subtotal + referralTotal
        ↓
UI displays updated amount
```

---

## Component Structure

### Page Hierarchy

```
app/admin/b2b-booking/
├── page.tsx                                    (Company List)
│   └── CompanyList Component
│       └── CompanyForm (Modal)
│
├── companies/
│   └── [id]/
│       └── page.tsx                           (Company Detail)
│           ├── Company Info Cards
│           └── ServiceList Component
│               └── ServiceForm (Modal)
│
└── companies/
    └── [id]/
        └── services/
            └── [serviceId]/
                ├── page.tsx                   (Service Detail)
                │   ├── Service Info Cards
                │   ├── Financial Summary
                │   ├── VehicleList Component
                │   │   └── VehicleForm (Modal)
                │   └── ReferralList Component
                │       └── ReferralForm (Modal)
                │
                └── vehicles/
                    └── [vehicleId]/
                        └── page.tsx           (Vehicle Detail)
                            ├── Vehicle Info
                            └── PreInspectionList Component
                                └── PreInspectionForm (Modal)
```

### Component Responsibilities

| Component | Props | Responsibilities |
|-----------|-------|------------------|
| `CompanyForm` | `onSuccess?` | Create/Edit company via modal form |
| `CompanyList` | `companies, isLoading, onRefresh` | Display all companies, search, delete |
| `ServiceForm` | `companyId, onSuccess?` | Create service for a company |
| `ServiceList` | `companyId, services, onRefresh` | List services, generate quotation/invoice |
| `VehicleForm` | `companyId, serviceId, onSuccess?` | Add vehicle to a service |
| `VehicleList` | `companyId, serviceId, vehicles` | Display vehicles, link to detail |
| `ReferralForm` | `companyId, serviceId, vehicleIds?` | Add referral with commission |
| `ReferralList` | `companyId, serviceId, referrals` | List referrals, delete, show total |
| `PreInspectionForm` | `companyId, serviceId, vehicleId` | Upload media, create inspection record |
| `PreInspectionList` | `companyId, serviceId, vehicleId` | Display inspections with media |

---

## Data Flow Diagrams

### 1. Company Creation Flow

```
User clicks "Add New Company"
    ↓
CompanyForm Dialog opens
    ↓
User fills form + validates (Zod)
    ↓
useCreateCompany mutation triggered
    ↓
companiesService.createCompany(data, userId)
    ↓
Firestore: setDoc(companies/{autoId}, {
  name, contactPerson, phone, email, ...,
  createdAt, createdBy, isActive: true
})
    ↓
Mutation resolves with new company data
    ↓
React Query invalidates ['b2b:companies']
    ↓
useCompanies hook re-fetches
    ↓
CompanyList re-renders with new company
    ↓
Dialog closes, form resets
```

### 2. Service Detail View with Totals

```
User navigates to service detail
    ↓
Multiple parallel queries start:
├─ useServiceById(companyId, serviceId)
├─ useVehicles(companyId, serviceId)
├─ useReferrals(companyId, serviceId)
└─ useCompanyById(companyId)
    ↓
Data loads (showing spinners while loading)
    ↓
useCalculateTotals(vehicles, referrals) computes:
  subtotal = 5000 + 3000 + 2000 = 10000
  referralTotal = 500 + 300 = 800
  totalAmount = 10800
    ↓
Financial Summary card displays totals
    ↓
(Optional) User updates vehicle cost
    ↓
useUpdateVehicle mutation fires
    ↓
Firestore updates vehicle cost
    ↓
React Query invalidates parent service query
    ↓
useCalculateTotals recalculates automatically
    ↓
UI updates with new total
```

### 3. File Upload (Pre-Inspection) Flow

```
User clicks "Add Pre-Inspection"
    ↓
PreInspectionForm Dialog opens
    ↓
User selects images/videos from device
    ↓
Files added to local state: setImages([...])
    ↓
User fills notes + checklist
    ↓
Form submission triggered
    ↓
Upload to Firebase Storage (parallel):
├─ images/{companyId}/services/{serviceId}/vehicles/{vehicleId}/images/{timestamp}_{name}
└─ videos/{companyId}/services/{serviceId}/vehicles/{vehicleId}/videos/{timestamp}_{name}
    ↓
Get download URLs / storage paths
    ↓
createPreInspection mutation fires with paths
    ↓
Firestore: Create preInspections/{inspectionId} with:
  {
    vehicleId, notes, checklist,
    images: [{name, path, uploadedAt}, ...],
    videos: [{name, path, uploadedAt}, ...],
    createdAt
  }
    ↓
Update vehicle.preInspectionCount++
    ↓
React Query invalidates pre-inspections cache
    ↓
PreInspectionList re-fetches and shows new record
    ↓
Dialog closes, local state resets
```

---

## Admin UX Considerations

### Navigation & Breadcrumbs

```
B2B Booking
  ├─ [Company List]
  │   └─ [Company Detail]
  │       └─ [Service List]
  │           └─ [Service Detail]
  │               └─ [Vehicle Detail]
  │                   └─ [Pre-Inspections]
```

Each page includes a "Back" button for easy navigation.

### Loading States

- **Page load**: Loading spinner with skeleton
- **List load**: Table shows "Loading..." placeholder
- **Form submission**: Button shows "Saving..." or "Uploading..."
- **Cache stale**: Subtle background update (no blocking)

### Action Feedback

- **Success**: Auto-close dialog, refresh list
- **Error**: Toast notification with error message
- **Validation**: Form field errors shown inline

### Search & Filter

- **Company List**: Search by name, email, contact person (client-side)
- **Service List**: Optional date range filter (server-side query)
- **Vehicle List**: None yet (can be added)

### Pagination

- **Companies**: Cursor-based pagination (stale-time aware)
- **Services**: Per company, cursor-based if many
- **Vehicles/Referrals**: Load all (typically < 50 per service)

---

## Mobile Responsiveness

### Responsive Breakpoints

All components use Tailwind's responsive classes:
- `md:` for medium screens (768px+)
- `lg:` for large screens (1024px+)

### Mobile-Optimized Features

1. **Tables**: Horizontal scroll on mobile
   ```html
   <div className="overflow-x-auto">
     <Table>...</Table>
   </div>
   ```

2. **Dialogs**: Full-screen on mobile
   ```html
   <DialogContent className="max-w-2xl">
   ```

3. **Forms**: Single column layout on mobile
   ```html
   <div className="grid grid-cols-1 md:grid-cols-2">
   ```

4. **Cards**: Stacked on mobile, grid on desktop
   ```html
   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
   ```

### Touch-Friendly UI

- Button minimum height: 44px (touch target)
- Form inputs: Large tap areas
- Icons: 16-24px for visibility
- Spacing: Adequate padding for touch

---

## Error Handling

### Firestore Error Handling

```typescript
try {
  await companiesService.createCompany(data, userId);
} catch (error) {
  if (error.code === 'permission-denied') {
    showError('You do not have permission to create companies');
  } else if (error.code === 'quota-exceeded') {
    showError('Database quota exceeded');
  } else {
    showError('Failed to create company: ' + error.message);
  }
}
```

### Form Validation Errors

Zod schema provides client-side validation errors:
```typescript
{
  name: { message: 'Company name is required' }
}
```

Displayed inline under form fields using `FormMessage` component.

### Network Error Recovery

React Query provides built-in retry logic:
```typescript
useQuery({
  queryFn: fetchData,
  retry: 3,           // Retry 3 times
  retryDelay: 1000,   // 1 second between retries
})
```

---

## Performance Optimizations

### 1. Memoization

Components that depend on computed values use `useMemo`:
```typescript
const totals = useMemo(() => ({
  subtotal: vehicles.reduce((sum, v) => sum + v.serviceCost, 0),
  referralTotal: referrals.reduce((sum, r) => sum + r.commission, 0),
}), [vehicles, referrals]);
```

### 2. Lazy Loading

Page components use dynamic imports (Next.js):
```typescript
const CompanyForm = dynamic(() => import('./CompanyForm'), {
  loading: () => <div>Loading form...</div>
});
```

### 3. Image Optimization

Pre-inspection images use responsive sizes via storage URLs.

### 4. Query Batching

Parallel queries are run together to minimize waterfalls:
```typescript
const company = useCompanyById(id);
const services = useServices(id);
const totals = useServiceTotals(id);
// All start simultaneously
```

---

## Summary Table: Key Hooks

| Hook | Purpose | Return Type |
|------|---------|-------------|
| `useCompanies` | List/paginate companies | `{ companies, hasMore, isLoading }` |
| `useCompanyById` | Fetch single company | `{ data, isLoading, error }` |
| `useCreateCompany` | Create company mutation | `{ mutateAsync, isPending }` |
| `useServices` | List services (with filters) | `{ services, hasMore, isLoading }` |
| `useServiceById` | Fetch single service | `{ data, isLoading, error }` |
| `useCreateService` | Create service mutation | `{ mutateAsync, isPending }` |
| `useVehicles` | List vehicles for service | `{ vehicles, isLoading, error }` |
| `useAddVehicle` | Add vehicle mutation | `{ mutateAsync, isPending }` |
| `useReferrals` | List referrals for service | `{ referrals, isLoading, error }` |
| `useAddReferral` | Add referral mutation | `{ mutateAsync, isPending }` |
| `usePreInspections` | List inspections for vehicle | `{ preInspections, isLoading }` |
| `useCreatePreInspection` | Create inspection mutation | `{ mutateAsync, isPending }` |
| `useCalculateTotals` | Calculate service totals | `{ subtotal, referralTotal, totalAmount }` |

---

## Next Steps

### Future Enhancements

1. **Quotation Generation**: Implement quotation creation using service/vehicle data
2. **Invoice Generation**: Convert quotations to invoices with payment tracking
3. **Export to PDF**: Generate downloadable quotations/invoices
4. **Date Range Filtering**: UI controls for service filtering
5. **Batch Operations**: Select multiple services for bulk status updates
6. **Analytics Dashboard**: Summary stats for companies, services, revenue
7. **Referral Analytics**: Commission tracking and referral reports
8. **Offline Support**: Service Worker + IndexedDB for offline access
9. **Real-time Collaboration**: Presence indicators for concurrent edits
10. **Approval Workflows**: Service approval by managers before completion

---

## File Structure Reference

```
hooks/
├─ useB2B.ts                    # All B2B custom hooks
└─ use-toast.ts                 # Existing toast hook

lib/
├─ types/
│  └─ b2b.types.ts              # TypeScript interfaces & types
└─ firestore/
   └─ b2b-service.ts            # Firestore service layer

components/admin/b2b/
├─ CompanyForm.tsx              # Create/Edit company
├─ CompanyList.tsx              # List all companies
├─ ServiceForm.tsx              # Create service
├─ ServiceList.tsx              # List services
├─ VehicleForm.tsx              # Add vehicle
├─ VehicleList.tsx              # List vehicles
├─ ReferralForm.tsx             # Add referral
├─ ReferralList.tsx             # List referrals
├─ PreInspectionForm.tsx        # Create inspection
└─ PreInspectionList.tsx        # List inspections

app/admin/b2b-booking/
├─ page.tsx                     # Main B2B page (company list)
└─ companies/
   └─ [id]/
       ├─ page.tsx              # Company detail
       └─ services/
           └─ [serviceId]/
               ├─ page.tsx      # Service detail
               └─ vehicles/
                   └─ [vehicleId]/
                       └─ page.tsx  # Vehicle detail
```


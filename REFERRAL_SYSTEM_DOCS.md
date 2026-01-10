# Referral System Documentation

## Overview

A unified referral system has been implemented for the CarMantra application that supports both B2C (Service Booking) and B2B services. This system allows tracking of referrals, commission management, and future reporting capabilities.

## Architecture

### Type Definitions
**File:** `lib/types/referral.types.ts`

```typescript
interface Referral {
  id: string;
  serviceId: string;
  personName: string;
  contact: string;
  commission: number;
  referralDate: Timestamp | Date;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  referralType?: 'b2c' | 'b2b';
  referralSource?: string;
  conversionStatus?: 'no' | 'yes';
}

interface B2CReferral extends Referral {
  referralType: 'b2c';
  customerId?: string;
}

interface ReferralFormData {
  personName: string;
  contact: string;
  commission: number;
  referralDate: Date;
  status?: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}
```

### Firestore Structure

```
services/
  ├── {serviceId}
  │   └── referrals/
  │       ├── {referralId}
  │       │   ├── personName: string
  │       │   ├── contact: string
  │       │   ├── commission: number
  │       │   ├── referralDate: Timestamp
  │       │   ├── status: 'pending' | 'completed' | 'cancelled'
  │       │   ├── notes?: string
  │       │   ├── serviceId: string
  │       │   ├── referralType?: 'b2c' | 'b2b'
  │       │   ├── createdAt: Timestamp
  │       │   ├── updatedAt: Timestamp
  │       │   └── createdBy: string
```

## Components

### 1. ReferralList Component
**File:** `components/shared/ReferralList.tsx`

Displays a table of referrals with the following features:
- Sortable referral list
- Edit/Delete actions
- Total commission calculation
- Status badges (pending, completed, cancelled)
- Responsive table design

**Props:**
```typescript
interface ReferralListProps {
  serviceId: string;
  referrals: Referral[];
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (referralId: string) => Promise<void>;
  disabled?: boolean;
  onAddSuccess?: () => void;
}
```

### 2. ReferralForm Component
**File:** `components/shared/ReferralForm.tsx`

Dialog-based form for creating and editing referrals with the following fields:
- Person Name (required)
- Contact (Phone/Email - required)
- Commission Amount (required)
- Referral Date (required)
- Status (pending/completed/cancelled)
- Notes (optional)

**Props:**
```typescript
interface ReferralFormProps {
  serviceId: string;
  referral?: Referral; // For edit mode
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}
```

## Hooks

### useReferrals Hook
**File:** `hooks/useReferrals.ts`

Real-time referral data fetching with Firestore listener.

**Usage:**
```typescript
const { referrals, isLoading, error, deleteReferral } = useReferrals(serviceId);
```

**Features:**
- Real-time listener for referral updates
- Automatic sorting (newest first)
- Delete functionality
- Error handling

## Services

### Referral Service
**File:** `lib/firestore/referral-service.ts`

Firestore operations for referral management:

- `fetchReferralsByServiceId(serviceId)` - Get all referrals for a service
- `createReferral(serviceId, data, userId)` - Create new referral
- `updateReferral(serviceId, referralId, data)` - Update referral
- `deleteReferralDoc(serviceId, referralId)` - Delete referral
- `getTotalCommissionForService(serviceId)` - Calculate total commission
- `getReferralStatsForService(serviceId)` - Get referral statistics

## Integration Points

### 1. Service ID Page (B2C Booking)
**File:** `app/admin/book-service/[id]/page.tsx`

**Added:**
- Referral hook integration
- Referral List component with toggle
- Quick referral summary card
- Full referral management UI

**Location:** In the sidebar, below the Expenses card

### 2. B2B Booking
**File:** Already has referral components integrated

Can now use the shared components for consistency.

## Future Enhancements

### 1. Cross-Service Referral Queries
```typescript
// Fetch all referrals for a specific person across all services
fetchReferralsByPerson(personName, contact)

// Fetch all referrals from a specific source
fetchReferralsBySource(source)

// Fetch referrals within a date range
fetchReferralsByDateRange(startDate, endDate)
```

### 2. Analytics & Reporting
- Referral conversion tracking
- Commission trends
- Top referrers report
- Referral source analysis

### 3. Webhook Integration
- Email notifications for referral creation
- Commission payment tracking
- Referral milestone alerts

### 4. Advanced Filters
- Filter by status
- Filter by date range
- Filter by commission range
- Filter by referral source

## Usage Example

### In a React Component:

```typescript
import { ReferralList } from '@/components/shared/ReferralList';
import { useReferrals } from '@/hooks/useReferrals';

export function MyComponent({ serviceId }) {
  const { referrals, isLoading, deleteReferral } = useReferrals(serviceId);
  const [showList, setShowList] = useState(false);

  return (
    <Card>
      <h2>Referrals</h2>
      {showList && (
        <ReferralList
          serviceId={serviceId}
          referrals={referrals}
          isLoading={isLoading}
          onRefresh={() => {}} // Auto-refreshes via hook
          onDelete={deleteReferral}
        />
      )}
    </Card>
  );
}
```

### Direct Service Usage:

```typescript
import { 
  fetchReferralsByServiceId, 
  createReferral,
  getReferralStatsForService 
} from '@/lib/firestore/referral-service';

// Fetch referrals
const referrals = await fetchReferralsByServiceId(serviceId);

// Create referral
const referralId = await createReferral(serviceId, formData, userId);

// Get statistics
const stats = await getReferralStatsForService(serviceId);
console.log(`Total Commission: AED ${stats.totalCommission}`);
```

## Data Flow

```
1. Service Detail Page Loads
   ↓
2. useReferrals Hook Initialized
   ↓
3. Firestore Listener Attached to /services/{id}/referrals
   ↓
4. Real-time Data Stream to Component
   ↓
5. ReferralList Renders with Current Data
   ↓
6. User Actions (Add/Edit/Delete)
   ↓
7. Firestore Updated
   ↓
8. Listener Triggers Update
   ↓
9. Component Re-renders with New Data
```

## Status Values

- **pending**: Referral is active but commission not paid
- **completed**: Referral is active and commission has been paid
- **cancelled**: Referral was cancelled (no commission)

## Security Considerations

1. **Firestore Rules:** Ensure referral operations are protected
2. **User Permissions:** Only admins and managers can manage referrals
3. **Audit Trail:** All operations logged with `createdBy` and `updatedAt`
4. **Data Validation:** All inputs validated on client and server side

## Troubleshooting

### Referrals Not Loading
1. Check Firestore connection
2. Verify service ID is correct
3. Check browser console for errors
4. Verify Firestore rules allow read access

### Delete Not Working
1. Confirm user has delete permissions
2. Check Firestore rules allow delete
3. Verify referral ID is correct

### Real-time Updates Not Working
1. Check network connection
2. Verify Firestore listener is attached
3. Check browser console for errors
4. Try page refresh

## Performance Notes

- Referrals are lazy-loaded via the `useReferrals` hook
- Real-time listener provides instant updates without polling
- Sorting happens client-side (suitable for <1000 items)
- For large datasets, implement server-side sorting

## Migration Path

If using B2B's old referral system:

1. B2B components can switch to shared components
2. Use `referralType` field to distinguish B2C vs B2B
3. All data structure remains compatible
4. Direct drop-in replacement for B2B ReferralList/ReferralForm

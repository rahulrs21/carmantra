# Referral System - Migration Guide

## Summary

The referral system has been refactored to support both B2C and B2B services using shared, generic components. This document provides guidance on updating existing B2B implementations to use the new shared components.

## File Structure

### New Shared Components
- **`components/shared/ReferralList.tsx`** - Generic referral list component
- **`components/shared/ReferralForm.tsx`** - Generic referral form component

### New Hooks
- **`hooks/useReferrals.ts`** - Generic hook for fetching referrals (replaces B2B-specific logic)

### New Services
- **`lib/firestore/referral-service.ts`** - Centralized Firestore operations for referrals

### New Types
- **`lib/types/referral.types.ts`** - Generic referral types that extend to B2C and B2B

### Existing B2B Components (Can be retired or updated)
- `components/admin/b2b/ReferralList.tsx` - B2B specific (deprecated)
- `components/admin/b2b/ReferralForm.tsx` - B2B specific (deprecated)

## Migration Steps

### Option 1: Quick Update (Recommended for B2B)

Update B2B components to use the shared versions:

**Before (B2B page.tsx):**
```typescript
import { ReferralList } from '@/components/admin/b2b/ReferralList';
import { useAddReferral, useUpdateReferral, useDeleteReferral } from '@/hooks/useB2B';

// In component
const deleteReferral = useDeleteReferral();
const referrals = /* fetch from state */;

<ReferralList
  companyId={companyId}
  serviceId={serviceId}
  referrals={referrals}
  vehicleIds={vehicleIds}
  isLoading={isLoading}
  onRefresh={onRefresh}
  disabled={disabled}
/>
```

**After (Updated to use shared):**
```typescript
import { ReferralList } from '@/components/shared/ReferralList';
import { useReferrals } from '@/hooks/useReferrals';

// In component
const { referrals, isLoading, deleteReferral } = useReferrals(serviceId);

<ReferralList
  serviceId={serviceId}
  referrals={referrals}
  isLoading={isLoading}
  onRefresh={() => {}} // Auto-refreshes
  onDelete={deleteReferral}
  disabled={disabled}
/>
```

### Step-by-Step for B2B Pages

1. **Find all B2B page files using referrals:**
   - `app/admin/b2b-booking/[id]/page.tsx`
   - Any other B2B detail pages

2. **Update imports:**
   ```typescript
   // Remove these
   import { ReferralList } from '@/components/admin/b2b/ReferralList';
   import { ReferralForm } from '@/components/admin/b2b/ReferralForm';
   import { useAddReferral, useUpdateReferral, useDeleteReferral } from '@/hooks/useB2B';
   
   // Add these
   import { ReferralList } from '@/components/shared/ReferralList';
   import { useReferrals } from '@/hooks/useReferrals';
   ```

3. **Update state and hooks:**
   ```typescript
   // Remove B2B-specific hooks
   const addReferral = useAddReferral();
   const updateReferral = useUpdateReferral();
   const deleteReferral = useDeleteReferral();
   
   // Add shared hook
   const { referrals, isLoading, deleteReferral } = useReferrals(serviceId);
   ```

4. **Update component props:**
   ```typescript
   // Old way
   <ReferralList
     companyId={companyId}
     serviceId={serviceId}
     referrals={referrals}
     vehicleIds={vehicleIds}
     isLoading={isLoading}
     onRefresh={onRefresh}
     disabled={disabled}
   />
   
   // New way
   <ReferralList
     serviceId={serviceId}
     referrals={referrals}
     isLoading={isLoading}
     onRefresh={() => {}}
     onDelete={deleteReferral}
     disabled={disabled}
   />
   ```

5. **Update data structure:**
   - If B2B referrals use different fields, ensure they match `Referral` interface
   - The shared components use: `personName`, `contact`, `commission`, `referralDate`, `status`, `notes`

## Type Compatibility

### Existing B2BReferral vs New Referral

**B2BReferral:**
```typescript
{
  id: string;
  serviceId: string;
  personName: string;
  contact: string;
  commission: number;
  referralDate: Timestamp | Date;
  notes?: string;
  status: ServiceStatus; // 'pending' | 'completed'
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
```

**New Referral (generic):**
```typescript
{
  id: string;
  serviceId: string;
  personName: string;
  contact: string;
  commission: number;
  referralDate: Timestamp | Date;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled'; // Added 'cancelled'
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  referralType?: 'b2c' | 'b2b'; // New field for type tracking
  referralSource?: string; // New optional field
  conversionStatus?: 'no' | 'yes'; // New optional field
}
```

**Changes needed in B2B:**
1. Change status enum to accept 'cancelled' as well
2. Add optional `referralType: 'b2b'` when creating referrals
3. Update any type assertions to use `Referral` instead of `B2BReferral`

## Database Migration

### No migration needed! 

The new shared structure is backward compatible with existing B2B referral data:

1. Existing B2B referral documents will work as-is
2. New optional fields (`referralType`, `referralSource`, `conversionStatus`) are optional
3. Set `referralType: 'b2b'` for existing B2B referrals (optional, can be done gradually)

## Hook Migration

### Old B2B Hooks (useB2B.ts):
```typescript
const addReferral = useAddReferral(); // Mutation
const updateReferral = useUpdateReferral(); // Mutation
const deleteReferral = useDeleteReferral(); // Mutation
```

### New Shared Hook:
```typescript
const { referrals, isLoading, error, deleteReferral } = useReferrals(serviceId);
// Referrals automatically update in real-time
// deleteReferral is a simple async function
```

**Key differences:**
- Old: Required manual mutation management
- New: Real-time listener with automatic updates
- Old: Multiple hooks for CRUD operations
- New: Single hook for read + single delete function

## Service Integration

### Using Firestore Service Directly

Instead of using hooks, you can call service functions directly:

```typescript
import { 
  fetchReferralsByServiceId,
  createReferral,
  updateReferral,
  deleteReferralDoc,
  getReferralStatsForService
} from '@/lib/firestore/referral-service';

// Fetch
const referrals = await fetchReferralsByServiceId(serviceId);

// Create
const referralId = await createReferral(serviceId, data, userId);

// Update
await updateReferral(serviceId, referralId, data);

// Delete
await deleteReferralDoc(serviceId, referralId);

// Stats
const stats = await getReferralStatsForService(serviceId);
```

## Testing Checklist

After migration, verify:

- [ ] Referrals load correctly
- [ ] Add referral works
- [ ] Edit referral works
- [ ] Delete referral works
- [ ] Real-time updates work
- [ ] Commission calculations are correct
- [ ] Status filtering works
- [ ] Data persists after page refresh
- [ ] No console errors

## Rollback Plan

If issues arise, you can:

1. **Keep B2B-specific files for now:**
   - Keep `components/admin/b2b/ReferralList.tsx` and `ReferralForm.tsx`
   - Keep them alongside shared components
   - B2B can continue using B2B-specific versions

2. **Gradual migration:**
   - Update one page at a time
   - Test thoroughly between updates
   - Keep old components as fallback

3. **Version control:**
   - All changes are committed
   - Easy to revert if needed

## Performance Improvements

The new shared system provides:

1. **Real-time updates** - No need to manually refresh
2. **Single hook** - Simpler state management
3. **Centralized logic** - Less code duplication
4. **Better error handling** - Consistent error management

## FAQ

**Q: Will existing B2B referrals still work?**
A: Yes, completely backward compatible. No data migration needed.

**Q: Can I use both old and new components?**
A: Yes, during transition. But eventually retire B2B-specific components.

**Q: Do I need to update Firestore rules?**
A: Only if using new optional fields. Existing rules should work fine.

**Q: What about B2B-specific features?**
A: The shared components have everything B2B components had, plus:
- Support for 'cancelled' status
- Better error handling
- Real-time updates
- Centralized service functions

**Q: How do I track B2C vs B2B referrals?**
A: Use the `referralType` field: 'b2c' or 'b2b'. It's optional but recommended for reporting.

## Next Steps

1. Update B2B pages to use shared components
2. Remove B2B-specific referral components (or keep as backup)
3. Test thoroughly in staging
4. Deploy to production
5. Monitor for any issues
6. Use `referralType` for future analytics

---

**Questions?** Check [REFERRAL_SYSTEM_DOCS.md](./REFERRAL_SYSTEM_DOCS.md) for detailed documentation.

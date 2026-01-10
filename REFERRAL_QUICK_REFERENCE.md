# Referral System - Implementation Quick Reference

## Quick Start

### 1. Display Referrals in Any Service Detail Page

```typescript
import { ReferralList } from '@/components/shared/ReferralList';
import { useReferrals } from '@/hooks/useReferrals';

export function ServiceDetailsPage() {
  const { id } = useParams();
  const { referrals, isLoading, deleteReferral } = useReferrals(id);
  const [showReferrals, setShowReferrals] = useState(false);

  return (
    <Card>
      <CardHeader>
        <h2>Referrals ({referrals.length})</h2>
        <Button onClick={() => setShowReferrals(!showReferrals)}>
          {showReferrals ? 'Hide' : 'View'}
        </Button>
      </CardHeader>

      {showReferrals && (
        <ReferralList
          serviceId={id}
          referrals={referrals}
          isLoading={isLoading}
          onRefresh={() => {}}
          onDelete={deleteReferral}
          disabled={false}
        />
      )}
    </Card>
  );
}
```

## File Locations & Responsibilities

### Components (UI)
| File | Purpose | Used For |
|------|---------|----------|
| `components/shared/ReferralList.tsx` | Display/manage referrals | All service types |
| `components/shared/ReferralForm.tsx` | Add/edit referrals | All service types |

### Hooks (State & Listeners)
| File | Purpose | Returns |
|------|---------|---------|
| `hooks/useReferrals.ts` | Real-time referral data | `{ referrals, isLoading, error, deleteReferral }` |

### Services (Firestore)
| File | Purpose | Methods |
|------|---------|---------|
| `lib/firestore/referral-service.ts` | Firestore operations | `fetchReferrals*`, `createReferral`, `updateReferral`, `deleteReferral*`, `getTotalCommission*`, `getReferralStats*` |

### Types (Interfaces)
| File | Purpose | Exports |
|------|---------|---------|
| `lib/types/referral.types.ts` | Type definitions | `Referral`, `B2CReferral`, `ReferralFormData` |

## Implementation Patterns

### Pattern 1: Simple Display (Read-Only)
```typescript
const { referrals, isLoading } = useReferrals(serviceId);

return (
  <ReferralList
    serviceId={serviceId}
    referrals={referrals}
    isLoading={isLoading}
    onRefresh={() => {}}
    onDelete={async () => {}}
    disabled={true} // Read-only
  />
);
```

### Pattern 2: Full CRUD
```typescript
const { referrals, isLoading, deleteReferral } = useReferrals(serviceId);

return (
  <ReferralList
    serviceId={serviceId}
    referrals={referrals}
    isLoading={isLoading}
    onRefresh={() => {}} // Auto-refreshes
    onDelete={deleteReferral}
    disabled={isEmployee}
  />
);
```

### Pattern 3: With Summary
```typescript
const { referrals, isLoading } = useReferrals(serviceId);

const stats = {
  total: referrals.length,
  commission: referrals.reduce((s, r) => s + r.commission, 0),
  pending: referrals.filter(r => r.status === 'pending').length,
};

return (
  <>
    <SummaryCard stats={stats} />
    {showDetails && (
      <ReferralList
        serviceId={serviceId}
        referrals={referrals}
        isLoading={isLoading}
        onRefresh={() => {}}
        onDelete={deleteReferral}
      />
    )}
  </>
);
```

## Common Customizations

### Add Custom Styling
```typescript
<Card className="p-3 md:p-6 border-2 border-purple-200">
  <ReferralList
    serviceId={serviceId}
    referrals={referrals}
    isLoading={isLoading}
    onRefresh={() => {}}
    onDelete={deleteReferral}
  />
</Card>
```

### Filter Referrals
```typescript
const completed = referrals.filter(r => r.status === 'completed');
const pending = referrals.filter(r => r.status === 'pending');

<ReferralList referrals={completed} /> // Show only completed
```

### Calculate Statistics
```typescript
const totalCommission = referrals.reduce((s, r) => s + r.commission, 0);
const avgCommission = totalCommission / referrals.length;
const highestCommission = Math.max(...referrals.map(r => r.commission));
```

### Disable Based on State
```typescript
<ReferralList
  disabled={
    isEmployee || 
    service?.status === 'completed' || 
    service?.status === 'cancelled'
  }
/>
```

## Firestore Rules (Recommended)

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Referrals - accessible to admins and managers
    match /services/{serviceId}/referrals/{referralId} {
      allow read, write: if request.auth != null && 
        request.auth.token.role in ['admin', 'manager'];
    }
    
    // Allow employees to view only
    allow read: if request.auth != null && 
      request.auth.token.role == 'employee';
  }
}
```

## Data Structure Reference

### Referral Document
```json
{
  "id": "1704067200000",
  "serviceId": "service-123",
  "personName": "John Doe",
  "contact": "+971501234567",
  "commission": 150,
  "referralDate": {"_seconds": 1704067200},
  "status": "pending",
  "notes": "Referred by family member",
  "referralType": "b2c",
  "createdAt": {"_seconds": 1704067200},
  "updatedAt": {"_seconds": 1704067200},
  "createdBy": "admin-user-123"
}
```

## Common Use Cases

### 1. Track Commission per Service
```typescript
const totalCommission = referrals.reduce((s, r) => s + r.commission, 0);
console.log(`Total Commission for Service: AED ${totalCommission}`);
```

### 2. Find Pending Referrals
```typescript
const pending = referrals.filter(r => r.status === 'pending');
console.log(`Pending Referrals: ${pending.length}`);
console.log(`Pending Commission: AED ${pending.reduce((s, r) => s + r.commission, 0)}`);
```

### 3. Export Referral Data
```typescript
const csv = referrals.map(r => 
  `${r.personName},${r.contact},${r.commission},${r.status}`
).join('\n');
```

### 4. Search Referrals
```typescript
const search = (term) => {
  return referrals.filter(r =>
    r.personName.includes(term) ||
    r.contact.includes(term)
  );
};
```

## Debugging

### Check Real-time Connection
```typescript
const { referrals, isLoading, error } = useReferrals(serviceId);

useEffect(() => {
  console.log('Referrals:', referrals);
  console.log('Loading:', isLoading);
  console.log('Error:', error);
}, [referrals, isLoading, error]);
```

### Verify Firestore Path
```typescript
// Referrals are stored at:
/services/{serviceId}/referrals/{referralId}

// Make sure serviceId is correct:
console.log('Service ID:', serviceId);
```

### Test Delete Function
```typescript
const handleDeleteTest = async (referralId) => {
  try {
    console.log('Deleting:', referralId);
    await deleteReferral(referralId);
    console.log('Deleted successfully');
  } catch (err) {
    console.error('Delete failed:', err);
  }
};
```

## Performance Tips

1. **Use useReferrals for real-time:** Don't fetch manually if using the hook
2. **Cache results:** The hook caches until unmounted
3. **Limit list size:** For 1000+ items, implement pagination
4. **Lazy load:** Show summary first, load full list on demand

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile: ✅ Full support (tested)

## Version Info

- Created: January 2026
- Component Version: 1.0
- Hook Version: 1.0
- Service Version: 1.0

---

**Need Help?** 
- See [REFERRAL_SYSTEM_DOCS.md](./REFERRAL_SYSTEM_DOCS.md) for detailed docs
- See [REFERRAL_MIGRATION_GUIDE.md](./REFERRAL_MIGRATION_GUIDE.md) for migration steps

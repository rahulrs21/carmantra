# Activity History Integration Guide

## Quick Start - Adding Activity Logging to New Components

### Step 1: Import Required Modules
```typescript
import { activityService } from '@/lib/firestore/activity-service';
import { useUser } from '@/lib/userContext';
```

### Step 2: Get User Information
```typescript
const { user, role } = useUser();
```

### Step 3: Log Activity After Any Action
```typescript
// After successfully completing an action
await activityService.logActivity({
  companyId: companyId,  // Required: company being modified
  activityType: 'service_updated',  // Choose from ActivityType enum
  description: `Clear description of what happened`,
  userId: user?.uid || 'unknown',
  userName: user?.name || 'Unknown User',
  userEmail: user?.email || 'unknown@email.com',
  userRole: role || 'unknown',
  metadata: {
    // Optional: Add any additional context
    serviceId: serviceId,
    itemId: itemId,
    oldValue: oldValue,
    newValue: newValue,
  },
});
```

---

## Activity Types Reference

Use these predefined activity types:

### Company Level
- `company_created` - New company added
- `company_updated` - Company details modified
- `company_deleted` - Company removed

### Service Level
- `service_created` - New service booking created
- `service_updated` - Service details or status changed
- `service_deleted` - Service booking deleted

### Quotation Level
- `quotation_created` - New quotation generated
- `quotation_updated` - Quotation modified
- `quotation_deleted` - Quotation removed

### Invoice Level
- `invoice_created` - New invoice generated
- `invoice_updated` - Invoice modified
- `invoice_deleted` - Invoice removed

### Other
- `email_sent` - Email notification sent
- `referral_added` - New referral added
- `referral_updated` - Referral modified
- `referral_deleted` - Referral removed

---

## Real-World Examples

### Example 1: Service Status Change
```typescript
await activityService.logActivity({
  companyId: id,
  activityType: 'service_updated',
  description: `Service status changed from "pending" to "completed"`,
  userId: user?.uid || 'unknown',
  userName: user?.name || 'Unknown User',
  userEmail: user?.email || 'unknown@email.com',
  userRole: role || 'unknown',
  metadata: {
    serviceId: serviceId,
    oldStatus: 'pending',
    newStatus: 'completed',
  },
});
```

### Example 2: Expense Addition
```typescript
await activityService.logActivity({
  companyId: id,
  activityType: 'service_updated',
  description: `Expense "Ceramic Coating Materials" added - AED 1,500`,
  userId: user?.uid || 'unknown',
  userName: user?.name || 'Unknown User',
  userEmail: user?.email || 'unknown@email.com',
  userRole: role || 'unknown',
  metadata: {
    serviceId: serviceId,
    expenseId: expenseId,
    category: 'Ceramic Coating Materials',
    amount: 1500,
    vendor: 'Supplier XYZ',
  },
});
```

### Example 3: Vehicle Service Added
```typescript
await activityService.logActivity({
  companyId: id,
  activityType: 'service_updated',
  description: `Service added to vehicle ABC-123 - PPF Protection (AED 2,500)`,
  userId: user?.uid || 'unknown',
  userName: user?.name || 'Unknown User',
  userEmail: user?.email || 'unknown@email.com',
  userRole: role || 'unknown',
  metadata: {
    serviceId: serviceId,
    vehicleId: vehicleId,
    vehiclePlate: 'ABC-123',
    serviceDescription: 'PPF Protection',
    serviceAmount: 2500,
  },
});
```

### Example 4: Invoice Sent
```typescript
await activityService.logActivity({
  companyId: companyId,
  activityType: 'invoice_created',
  description: `Invoice INV-2025-001 created and sent to ${email}`,
  userId: user?.uid || 'unknown',
  userName: user?.name || 'Unknown User',
  userEmail: user?.email || 'unknown@email.com',
  userRole: role || 'unknown',
  metadata: {
    serviceId: serviceId,
    invoiceId: invoiceId,
    invoiceNumber: 'INV-2025-001',
    amount: 5000,
    sentTo: email,
  },
});
```

---

## Error Handling

The service automatically handles errors gracefully:

```typescript
try {
  await activityService.logActivity({
    // ... activity data
  });
  // Activity logged successfully
} catch (error) {
  console.error('Error logging activity:', error);
  // Activity logging failed, but don't block main operation
  // The main action (service update, etc.) still completed
}
```

**Important:** Always place activity logging **after** the main action completes successfully. This way, if activity logging fails, it won't prevent the actual operation from completing.

---

## Best Practices

### ✅ DO

1. **Log immediately after successful operations**
   ```typescript
   // Update happens
   await updateService(...);
   // Log activity
   await activityService.logActivity(...);
   ```

2. **Include descriptive messages**
   ```typescript
   description: `Service status changed to completed with 3 vehicles`
   ```

3. **Add relevant metadata**
   ```typescript
   metadata: {
     serviceId: serviceId,
     vehicleCount: 3,
     totalCost: 15000,
   }
   ```

4. **Use proper role names**
   - admin, manager, sales, accounts, employee

5. **Include user information from context**
   ```typescript
   userId: user?.uid
   userName: user?.name
   userEmail: user?.email
   ```

### ❌ DON'T

1. **Log before confirming the action succeeded**
   ```typescript
   // WRONG - logs before update
   await activityService.logActivity(...);
   await updateService(...);
   ```

2. **Use generic descriptions**
   ```typescript
   // WRONG
   description: 'Updated'
   
   // RIGHT
   description: 'Service status changed to completed'
   ```

3. **Leave required fields empty**
   ```typescript
   // WRONG - missing userId, userName, etc.
   await activityService.logActivity({
     companyId: id,
     activityType: 'service_updated',
     description: 'Something happened',
     // Missing user info!
   });
   ```

4. **Log sensitive information in description**
   ```typescript
   // WRONG - password or token in description
   description: `User logged in with password ${password}`
   ```

---

## Viewing Activities

### In Application
Click the floating history button (bottom-right corner) on any page to view all company activities.

### In Firestore Console
Navigate to: `Collections → activity_logs`

Filter by `companyId` to see activities for a specific company.

---

## Performance Considerations

- Activities are sorted client-side (no composite index required)
- Modal loads activities on open (lazy loading)
- Large activity lists use scroll area
- Timestamps are formatted relative to current time

---

## Extending Activity Types

To add new activity types:

1. Update `lib/types/activity.types.ts`:
   ```typescript
   export type ActivityType = 
     | 'your_new_type'
     // ... existing types
   ```

2. Add label and styling in `ActivityHistoryModal.tsx`:
   ```typescript
   const ACTIVITY_TYPE_LABELS = {
     your_new_type: { 
       label: 'Your Activity Label', 
       color: 'bg-green-100 text-green-800', 
       icon: '🎉' 
     },
     // ... existing types
   }
   ```

3. Use in your component:
   ```typescript
   await activityService.logActivity({
     activityType: 'your_new_type',
     // ... rest of activity data
   });
   ```

---

## Troubleshooting

### Activities not showing up?
1. Check Firestore rules - ensure activity_logs collection is accessible
2. Verify `companyId` is correct
3. Check browser console for errors
4. Verify user information is being passed correctly

### Timestamps showing incorrectly?
- Firestore Timestamp objects are automatically converted
- Relative times update every render
- Full dates use en-GB format

### Button not appearing?
- Ensure `ActivityHistoryButton` is imported
- Check z-index isn't being overridden by other elements
- Button uses fixed positioning (bottom: 32px, right: 32px)

---

## Integration Checklist

- [ ] Import activityService in your component
- [ ] Import useUser hook
- [ ] Add showActivityHistory state if component isn't already updated
- [ ] Import ActivityHistoryButton and ActivityHistoryModal components
- [ ] Add button and modal to JSX
- [ ] Add activity logging after key actions
- [ ] Test activity appears in history modal
- [ ] Verify user information is captured correctly
- [ ] Test on mobile/tablet/desktop

---

## Questions?

Refer to:
- `ACTIVITY_HISTORY_IMPLEMENTATION.md` - Full technical documentation
- `lib/firestore/activity-service.ts` - Service implementation
- `components/ActivityHistoryModal.tsx` - UI component logic
- Real examples in: service detail page, vehicle detail page

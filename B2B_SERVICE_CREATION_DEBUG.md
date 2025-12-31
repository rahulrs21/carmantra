# B2B Service Creation - Complete Debugging & Testing Guide

## Database Collections Overview

The B2B module uses **5 main Firestore collections** (all at root level):

### 1. **b2b-companies**
Root collection storing all B2B client companies.
- Required fields: `name`, `contactPerson`, `phone`, `email`
- Auto-set fields: `createdAt`, `createdBy`, `updatedAt`, `isActive`

### 2. **b2b-services** ⭐
Stores all services with amounts and status.
- **companyId** (REQUIRED) - Links to parent company
- **title** (REQUIRED) - Service name
- **type** (REQUIRED) - Service type enum
- **serviceDate** (REQUIRED) - When service was performed
- **dateRangeStart** (OPTIONAL) - Range start
- **dateRangeEnd** (OPTIONAL) - Range end
- **status** - 'pending' | 'completed' | 'cancelled'
- **totalAmount**, **subtotal**, **referralTotal** - Calculated amounts
- Auto-set: `createdAt`, `createdBy`, `updatedAt`

### 3. **b2b-vehicles**
Vehicles linked to services.
- **companyId** + **serviceId** (REQUIRED) - Links to parent
- Vehicle details: brand, model, year, color, plate, VIN

### 4. **b2b-pre-inspections**
Inspection records for vehicles.
- **vehicleId** + **serviceId** + **companyId** (REQUIRED)
- Images and videos array

### 5. **b2b-referrals**
Referral commission tracking.
- **serviceId** + **companyId** (REQUIRED)
- Commission percentage and amount

---

## Service Creation Flow

### Step 1: User opens Service Form
```
Company Detail Page
  ↓
ServiceList Component
  ↓
ServiceForm Component (Modal)
```

### Step 2: Form Validation
```
ServiceForm validates with Zod schema:
✓ title (required)
✓ type (required)
✓ serviceDate (required)
○ dateRangeStart (optional)
○ dateRangeEnd (optional)
○ notes (optional)
```

### Step 3: Submit
```
onSubmit() 
  → useCreateService hook
    → servicesService.createService()
      → Firestore setDoc()
        → Query cache invalidation
          → ServiceList re-renders
```

---

## Common Issues & Solutions

### Issue 1: "undefined field value" Error
**Symptom**: `Unsupported field value: undefined (found in field dateRangeStart...)`

**Root Cause**: Firestore doesn't allow undefined values in documents.

**Solution**: Only add optional fields if they have values (✅ FIXED)
```typescript
const service: any = {
  // Always include required fields
  id: docRef.id,
  companyId,
  title: data.title,
  type: data.type,
  serviceDate: Timestamp.fromDate(data.serviceDate),
  notes: data.notes || '',
  status: 'pending',
  totalAmount: 0,
  subtotal: 0,
  referralTotal: 0,
  createdAt: now,
  createdBy: userId,
  updatedAt: now,
};

// Only add optional fields if they exist
if (data.dateRangeStart) {
  service.dateRangeStart = Timestamp.fromDate(data.dateRangeStart);
}
if (data.dateRangeEnd) {
  service.dateRangeEnd = Timestamp.fromDate(data.dateRangeEnd);
}

await setDoc(docRef, service);
```

---

### Issue 2: "User not authenticated"
**Symptom**: Service form shows error "User not authenticated"

**Root Cause**: 
- User context is null
- user.uid is undefined
- User session expired

**Solutions**:
1. Check login status
2. Verify UserContext is properly set up
3. Check if admin role is assigned

**Code that checks this**:
```typescript
const user = userContext?.user;

if (!user?.uid) {
  setError('User not authenticated. Please log in again.');
  return;
}
```

---

### Issue 3: "companyId is missing"
**Symptom**: Cannot create service on company page

**Root Cause**:
- Company ID not passed to ServiceForm
- URL params not properly extracted

**Solution**: Verify company ID is passed correctly:
```typescript
<ServiceList
  companyId={id}  // ← Must be valid company ID
  services={services}
  ...
/>

// Inside ServiceForm
<ServiceForm 
  companyId={companyId}  // ← Should not be undefined
  onSuccess={onRefresh} 
/>
```

---

### Issue 4: Service created but doesn't appear in list
**Symptom**: Form closes successfully but no new service in list

**Root Cause**:
- Query cache not invalidated
- Service query filters not matching
- Pagination issues

**Solution**: Cache invalidation is automatic via React Query:
```typescript
onSuccess: (_: any, variables: { companyId: string; ... }) => {
  // Automatically invalidates this query
  queryClient.invalidateQueries({ 
    queryKey: ['b2b:services', variables.companyId] 
  });
  // Triggers ServiceList to re-fetch
}
```

---

## Step-by-Step Testing

### Test 1: Create Service Successfully

1. Navigate to: `/admin/b2b-booking/companies/{companyId}`
2. Click "Add New Service" button (top right of Services card)
3. Fill form:
   - **Service Title**: "Car Wash"
   - **Service Type**: "car-wash"
   - **Service Date**: Today's date
   - **Date Range Start**: (leave blank)
   - **Date Range End**: (leave blank)
   - **Service Notes**: "Test service"
4. Click "Create Service"
5. **Expected Result**: 
   - Toast notification: "Service created successfully"
   - Modal closes
   - Service appears in table
   - Service has "pending" status
   - Amount shows "₹0" (no vehicles yet)

### Test 2: Create Service with Date Range

1. Click "Add New Service" again
2. Fill form:
   - **Service Title**: "Multi-Day Detail"
   - **Service Type**: "detailing"
   - **Service Date**: 2025-01-20
   - **Date Range Start**: 2025-01-18
   - **Date Range End**: 2025-01-22
   - **Service Notes**: "3-day detailing project"
3. Click "Create Service"
4. **Expected Result**: 
   - Service created with date range
   - Check Firestore console to verify:
     ```
     dateRangeStart: Timestamp(2025-01-18)
     dateRangeEnd: Timestamp(2025-01-22)
     ```

### Test 3: Verify Firestore Structure

1. Go to Firebase Console → Firestore Database
2. Navigate to `b2b-services` collection
3. Click on newest document
4. **Verify these fields exist**:
   ```
   ✓ id
   ✓ companyId (matches the company)
   ✓ title ("Car Wash")
   ✓ type ("car-wash")
   ✓ serviceDate (Timestamp)
   ✓ status ("pending")
   ✓ totalAmount (0)
   ✓ subtotal (0)
   ✓ referralTotal (0)
   ✓ notes ("")
   ✓ createdAt (Timestamp)
   ✓ createdBy (admin user ID)
   ✓ updatedAt (Timestamp)
   ```
5. **Do NOT see**:
   ```
   ✗ dateRangeStart (if not provided)
   ✗ dateRangeEnd (if not provided)
   ✗ undefined fields
   ```

---

## Browser Console Debugging

### What to look for:

**Successful creation logs**:
```
[ServiceForm] Submitting form with data: {...}
[ServiceForm] Calling createService.mutateAsync with: {...}
[b2b-service] createService called with: {...}
[b2b-service] Saving service to Firestore: {...}
[b2b-service] Service created successfully: {...}
```

**Error logs** (if something fails):
```
[ServiceForm] Error creating service: Error: message here
[b2b-service] Error creating service: Error: message here
```

---

## Firestore Rules Verification

The B2B collections require these security rules:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // B2B Collections - admin-only
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
  }
}
```

**To deploy**: 
```bash
firebase deploy --only firestore:rules
```

---

## Code Changes Summary

### ✅ Fixed Issues

1. **ServiceForm.tsx** - Enhanced with:
   - Toast notifications (success/error)
   - User authentication validation
   - Company ID validation
   - Detailed console logging
   - Error display in UI
   - Better error handling

2. **b2b-service.ts** - createService function:
   - Input validation (companyId, userId, title, serviceDate)
   - No undefined values sent to Firestore
   - Optional fields only included if they have values
   - Comprehensive console logging
   - Proper error handling

3. **New Documentation**:
   - B2B_DATABASE_COLLECTIONS.md - Complete schema reference
   - B2B_SERVICE_CREATION_DEBUG.md (this file)

---

## Quick Checklist Before Testing

- [ ] User is logged in with admin role
- [ ] Firestore rules are deployed
- [ ] Company exists in database
- [ ] Browser console is open (F12)
- [ ] Check Network tab for Firestore requests
- [ ] Disable browser cache (DevTools → Settings → Disable cache)

---

## Support

If service creation still doesn't work:

1. **Check browser console** for error messages
2. **Check Firestore rules** - ensure user has admin role
3. **Verify companyId** - must be valid company in database
4. **Check Firestore quota** - ensure not exceeded
5. **Try in private/incognito window** - might be cache issue

---

## Next Steps

After services are created:
1. **Add vehicles** to services
2. **Create pre-inspections** for vehicles
3. **Track referrals** and commissions
4. **Generate quotations/invoices**
5. **View billing reports**

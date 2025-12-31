# B2B Referrals - Debugging Guide

## What Was Enhanced

Added comprehensive logging and error handling to the referral creation flow to help identify issues:

### 1. ReferralForm.tsx
- Added `useToast` hook for user feedback
- Added detailed console logging at each step
- Added error toast notification with error message
- Added success toast notification
- Logs format: `[ReferralForm] [action]: [details]`

### 2. useAddReferral Hook
- Added mutation function logging before calling service
- Added onSuccess logging for cache invalidation
- Added onError logging for error tracking
- Logs format: `[useAddReferral] [action]: [details]`

### 3. referralsService (b2b-service.ts)
- Added input validation logging
- Added Firestore path logging
- Added referral object logging before save
- Added success confirmation with ID
- Logs format: `[referralsService] [action]: [details]`

## How to Debug

### Step 1: Open Browser Console
1. Press `F12` or right-click → Inspect
2. Go to **Console** tab
3. Clear existing logs (Ctrl+L)

### Step 2: Try to Add a Referral
1. Navigate to a service detail page
2. Scroll to Referrals section
3. Click "Add Referral" button
4. Fill in the form:
   - Person Name: "Test Person"
   - Contact: "9876543210"
   - Commission: 500
   - Referral Date: Today
5. Click "Add Referral"

### Step 3: Check Console Logs
Look for this sequence:

```
[ReferralForm] Form submitted with data: {
  personName: "Test Person",
  contact: "9876543210",
  commission: 500,
  referralDate: Date,
  linkedVehicleId: "",
  notes: ""
}

[ReferralForm] User authenticated: abc123xyz...

[ReferralForm] Calling addReferral.mutateAsync with: {
  companyId: "...",
  serviceId: "...",
  data: { ... },
  userId: "..."
}

[useAddReferral] Mutation function called with: { ... }

[referralsService] Creating referral: { ... }

[referralsService] Saving referral to Firestore: {
  id: "ref_123",
  serviceId: "...",
  personName: "Test Person",
  contact: "9876543210",
  commission: 500,
  referralDate: Timestamp,
  linkedVehicleId: undefined,
  notes: undefined,
  status: "pending",
  createdAt: Timestamp,
  updatedAt: Timestamp
}

[referralsService] Referral created successfully with ID: ref_123

[useAddReferral] Mutation successful, invalidating queries

Toast: "Success - Referral added successfully"
```

## Possible Issues & Solutions

### Issue 1: User Not Authenticated
**Log shows:** `[ReferralForm] User not authenticated`

**Solutions:**
- Logout and login again
- Check browser → Application → Local Storage → user_uid exists
- Verify admin role is set in Firestore users collection

### Issue 2: Form Not Submitting
**Log shows:** Nothing in console

**Solutions:**
- Check form validation - all required fields filled?
- Look for red error messages on form
- Check browser Developer Tools → Network tab for failed requests

### Issue 3: Firestore Error
**Log shows:** `[referralsService] Error creating referral: ...`

**Solutions:**
- Copy the full error message
- Check Firebase Console → Firestore → Rules
- Verify rules allow: `allow create, read` for authenticated users
- Check if path is correct: `companies/{companyId}/services/{serviceId}/referrals`

### Issue 4: Toast Error Notification
**Shows:** "Failed to add referral: [error message]"

**Solutions:**
- Read the error message carefully
- Check Firestore Rules
- Verify data types match B2BReferral interface
- Check companyId and serviceId are valid

## Data Flow Diagram

```
ReferralForm (input)
    ↓
[ReferralForm] logs
    ↓
User auth check
    ↓
useAddReferral hook
    ↓
[useAddReferral] logs
    ↓
referralsService.createReferral()
    ↓
[referralsService] logs
    ↓
Firestore: companies/{id}/services/{id}/referrals
    ↓
Success/Error
    ↓
Toast notification to user
    ↓
[ReferralForm] logs success/error
```

## Testing Checklist

✅ Open browser console
✅ Fill referral form completely
✅ Submit form
✅ Check for [ReferralForm] logs
✅ Check for authentication log
✅ Check for [useAddReferral] logs
✅ Check for [referralsService] logs
✅ Check for success toast
✅ Check Firestore for new document
✅ Refresh page - referral appears in list

## Firebase Rules Check

The referral should be stored at this path:
```
companies/{companyId}/services/{serviceId}/referrals/{referralId}
```

Firestore rules should allow:
```
match /companies/{companyId}/services/{serviceId}/referrals/{referralId} {
  allow create, read, update, delete: if request.auth != null;
}
```

## If Still Not Working

1. **Copy full error from console**
2. **Copy console logs (select all, copy)**
3. **Share these with developer**
4. **Include:**
   - What you entered in form
   - What error appeared
   - Full console log output
   - Screenshots of error messages

## Expected Result

After successful addition:
1. Toast shows "Success - Referral added successfully"
2. Dialog closes automatically
3. Referrals list refreshes
4. New referral appears with correct data
5. Firestore document created at correct path
6. Commission amount updates the Financial Summary total

## Files Modified

| File | Change |
|------|--------|
| `components/admin/b2b/ReferralForm.tsx` | Added useToast, logging, error handling |
| `hooks/useB2B.ts` | Added logging to mutation function and callbacks |
| `lib/firestore/b2b-service.ts` | Added detailed logging to createReferral() |

All changes are console-log only - **no data structure changes** - so referrals will work exactly the same way, just with better error visibility.

# Firestore Rules Fixed - Permission Error Resolution

## Problem Summary
Firebase was throwing **"Missing or insufficient permissions"** when trying to create a company in the B2B module.

## Root Cause
The Firestore security rules had **conflicting/duplicate rules** and didn't properly match the B2B collection structure.

## Solution Applied

### ✅ Updated Firestore Rules (`firestore.rules`)

**Key Changes:**

1. **Fixed Collection Names**
   - Updated from `b2b-companies` → `companies` (matches actual code)
   - Added proper nested subcollection rules for the B2B hierarchy

2. **Proper Nested Structure**
   ```
   companies/{companyId}
   ├── services/{serviceId}
   │   ├── vehicles/{vehicleId}
   │   │   └── preInspections/{inspectionId}
   │   └── referrals/{referralId}
   ```

3. **Consistent Permission Model**
   - All B2B operations now require: `request.auth != null && isAdmin()`
   - Uses the `isAdmin()` helper function to check user role
   - No conflicting/duplicate rules

4. **Admin Role Requirement**
   - The rules check if user's `users/{uid}.role == 'admin'`
   - Only authenticated users with admin role can access B2B data

## How to Fix the Permission Error

### Step 1: Verify User Role is Set
1. Go to **Firebase Console** → **Cloud Firestore** → **users** collection
2. Find your user document (look for your UID)
3. Ensure it has this field:
   ```
   role: "admin"
   ```

### Step 2: If User Document Doesn't Exist
Create a new document in the `users` collection:
- **Document ID**: Your UID (same as Firebase Auth user ID)
- **Fields**:
  ```json
  {
    "role": "admin",
    "email": "your-email@example.com",
    "displayName": "Your Name"
  }
  ```

### Step 3: Deploy Updated Rules
The rules have been updated in `firestore.rules`. Deploy them:
```bash
firebase deploy --only firestore:rules
```

### Step 4: Test Permission
Try creating a company again in the B2B module.

## Firestore Rule Breakdown

**B2B Companies Collection:**
```firestore
match /companies/{companyId} {
  allow read, create, update, delete: 
    if request.auth != null && isAdmin();
  
  // Services subcollection
  match /services/{serviceId} { ... }
}
```

**Helper Function:**
```firestore
function isAdmin() {
  return request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid))
      .data.role == 'admin';
}
```

## Testing Checklist

- [ ] User has `admin` role in `users/{uid}` document
- [ ] Firestore rules deployed with `firebase deploy --only firestore:rules`
- [ ] Try creating a company - should work now
- [ ] Try creating a service under that company
- [ ] Try adding vehicles, referrals, and pre-inspections
- [ ] All operations should succeed

## If Still Getting Permission Error

1. **Check Auth State**
   - Make sure you're logged in (check `request.auth != null`)
   - User should be authenticated to Firebase

2. **Verify Role**
   - Go to Firestore console
   - Check `users/{yourUID}` document has `role: "admin"`

3. **Check Collection Path**
   - Should be `companies` not `b2b-companies`
   - Subcollections: `services`, `vehicles`, `preInspections`, `referrals`

4. **Rules Deployment**
   - Confirm rules were deployed: `firebase deploy --only firestore:rules`
   - Check deployment status in Firebase Console

## Summary

✅ **Fixed Issues:**
- Removed duplicate/conflicting rules
- Corrected collection paths to match code
- Added proper nested subcollection rules
- Implemented consistent admin-only access control
- Uses `isAdmin()` helper for clean permission management

✅ **Expected Result:**
- B2B module operations now work without permission errors
- Only authenticated admin users can access B2B data
- All nested operations (services, vehicles, referrals, inspections) have proper permissions

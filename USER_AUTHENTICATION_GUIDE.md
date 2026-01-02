# User Authentication & Setup Guide

## Overview

The CarMantra application uses Firebase Authentication for user login and Firestore for role-based access control. Users must be created with a valid email/password combination and have a Firestore document with an assigned role.

## Error: "auth/invalid-credential"

**What it means**: The email/password combination doesn't exist in Firebase Authentication.

**Solutions**:
1. Create the user account using the Admin Setup page
2. Create the user using the Users management module (if you're already logged in)
3. Create user directly in Firebase Console

---

## Solution 1: Using Admin Setup Page (Recommended)

### For First-Time Admin Setup

1. Navigate to: `http://localhost:3000/admin/setup`
2. You'll see a **Verification Step**
   - Enter the admin setup code (check your `.env.local` file for `NEXT_PUBLIC_ADMIN_SETUP_CODE`)
   - Default: `SETUP123`
3. After verification, you'll see the **Setup Step**
   - Enter Display Name
   - Enter Email Address
   - Enter Password (minimum 6 characters)
   - Confirm Password
4. Click **Create Admin Account**
5. You'll be redirected to the login page
6. Login with your new credentials

### What Gets Created

When you create an admin account via Setup page:
- ✅ Firebase Authentication user created with email/password
- ✅ Firestore document in `users` collection with:
  - `role: 'admin'`
  - `email`: Your email
  - `displayName`: Your display name
  - `status: 'active'`
  - Full admin permissions

---

## Solution 2: Using Users Management Module

### For Creating Additional Users (After First Admin Login)

1. Login to admin panel
2. Navigate to: **Admin → Users Management**
3. Click **Add User**
4. Fill in the form:
   - Email Address *
   - Display Name
   - Role (admin, manager, sales, support, viewer)
   - Password *
   - Confirm Password
5. Click **Create User**

### User Role Permissions

| Role | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| **admin** | All | All | All | All |
| **manager** | All | All | All | All |
| **sales** | Limited | Limited | Own | No |
| **support** | Limited | No | Limited | No |
| **viewer** | Limited | No | No | No |

---

## Solution 3: Firebase Console (Manual)

### Step 1: Create Authentication User

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** → **Users** tab
4. Click **Add User**
5. Enter:
   - Email address
   - Password (8+ characters recommended)
6. Click **Add User**

### Step 2: Create Firestore Document

1. Navigate to **Firestore Database**
2. Go to `users` collection
3. Create new document with ID = **User's UID** (from authentication)
4. Add these fields:
   ```
   email (string): user's email
   displayName (string): user's display name
   role (string): 'admin', 'manager', 'sales', 'support', or 'viewer'
   status (string): 'active' or 'inactive'
   isOnline (boolean): false (initial value)
   permissions (array): Copy from DEFAULT_PERMISSIONS based on role
   createdAt (timestamp): current date/time
   ```

Example document:
```json
{
  "email": "admin@carmantra.com",
  "displayName": "Admin User",
  "role": "admin",
  "status": "active",
  "isOnline": false,
  "permissions": [
    {
      "module": "accounts",
      "canView": true,
      "canCreate": true,
      "canEdit": true,
      "canDelete": true
    },
    {
      "module": "employees",
      "canView": true,
      "canCreate": true,
      "canEdit": true,
      "canDelete": true
    },
    // ... more modules
  ],
  "createdAt": "2024-01-02T10:00:00Z"
}
```

---

## Authentication Flow Diagram

```
User Opens Login Page
        ↓
   Enter Credentials
        ↓
Firebase Authentication Check
        ↓
    ✓ Valid?
    ├─→ Yes: Check Firestore for role
    │       ↓
    │   ✓ Role Found?
    │   ├─→ Yes: Grant Access, Redirect to Dashboard
    │   └─→ No: Sign out, Show Error
    │
    └─→ No: Show "Invalid Credentials" Error
            ↓
        Suggest Setup Page
```

---

## Troubleshooting

### Error: "Invalid email or password"
- ✅ **Solution**: Create account via Setup page or Users module
- Check that user exists in Firebase Authentication
- Verify email spelling and password

### Error: "Your account is missing a role in Firestore"
- ✅ **Solution**: Create Firestore document for user
- Go to Firebase Console → Firestore
- Create document in `users` collection with user's UID
- Add `role` field with valid value

### Error: "You are not authorized to access the admin area"
- ✅ **Solution**: Update user's role
- Go to Firebase Console → Firestore
- Edit user document in `users` collection
- Change `role` to valid value: 'admin', 'manager', 'sales', 'support', 'viewer'

### Error: "Unable to read your role from Firestore due to permissions"
- ✅ **Solution**: Check Firestore security rules
- Ensure rules allow users to read their own document:
  ```firestore
  match /users/{uid} {
    allow read: if request.auth.uid == uid;
    allow write: if request.auth.uid == uid || isAdmin();
  }
  ```

---

## Best Practices

### ✅ Do's
- Create first admin account via Setup page
- Use Users module to create additional users
- Set appropriate roles based on job function
- Regularly review user access
- Update user status to 'inactive' instead of deleting

### ❌ Don'ts
- Don't share admin credentials
- Don't create users with weak passwords
- Don't delete user documents without backup
- Don't manually edit Firebase rules without testing
- Don't store passwords in code or environment variables

---

## Environment Configuration

### Setup Code Configuration

The admin setup page uses `NEXT_PUBLIC_ADMIN_SETUP_CODE` environment variable.

**In `.env.local`**:
```
NEXT_PUBLIC_ADMIN_SETUP_CODE=YOUR_SECURE_CODE_HERE
```

**Security Notes**:
- Change default code `SETUP123` to something secure
- Make code unique and hard to guess
- Don't share code publicly
- Consider disabling setup page after first admin is created

---

## Quick Reference

| Action | Where | Who |
|--------|-------|-----|
| Create First Admin | `/admin/setup` | Anyone (needs code) |
| Create More Users | Users Module | Admin only |
| Edit Users | Users Module | Admin only |
| Delete Users | Users Module | Admin only |
| View Roles | Dashboard | Anyone logged in |
| Change Own Password | Firebase Console | User (self-service coming soon) |

---

## Integration with User Module

The User Authentication system integrates with:

### 📚 Modules Using Authentication
- **Accounts Module** → Role-based access
- **Employees Module** → Role-based CRUD
- **B2B Module** → Role-based features
- **Services Module** → Role-based visibility
- **Reports Module** → Role-based data filtering

### 🔐 Permission Levels

```typescript
// admin role permissions (in /lib/types.ts)
export const DEFAULT_PERMISSIONS = {
  admin: [
    { module: 'accounts', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'employees', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'users', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'reports', canView: true, canCreate: true, canEdit: true, canDelete: true },
    // ... more modules
  ],
  // ... other roles
};
```

### 🔌 How Permissions Work

1. User logs in
2. System fetches user document from Firestore
3. User permissions are loaded based on role
4. Each page checks `<PermissionGate />` component
5. Features are shown/hidden based on permissions

Example:
```tsx
<PermissionGate module="employees" action="create">
  <Button>Add Employee</Button>
</PermissionGate>
```

---

## Support

For issues with:
- **Authentication errors**: Check Firebase Console → Authentication
- **Role-based access**: Check Firestore user documents
- **Permission issues**: Check PermissionGate components
- **Login page**: Check `/app/admin/login/page.tsx`
- **Users module**: Check `/app/admin/users/page.tsx`


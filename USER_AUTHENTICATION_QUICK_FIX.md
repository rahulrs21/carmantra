# Firebase Auth Error Fix - Quick Start

## Problem
```
Firebase: Error (auth/invalid-credential)
app/admin/login/page.tsx (39:22) @ async handleLogin
```

## Root Cause
The user account **does not exist** in Firebase Authentication. You need to create the user before you can log in.

---

## Solution: Create Your First Admin Account

### Step 1: Go to Admin Setup Page
```
http://localhost:3000/admin/setup
```

### Step 2: Enter Verification Code
The default code is: `SETUP123`

(Change this in your `.env.local` file for security)

### Step 3: Create Account
Fill in:
- **Display Name**: Your name
- **Email**: Your email address
- **Password**: At least 6 characters
- **Confirm Password**: Repeat password

### Step 4: Create & Login
Click "Create Admin Account" and you'll be redirected to login page.

Login with your new email and password.

---

## What Happens Behind the Scenes

When you create an account via `/admin/setup`:

### ✅ Firebase Authentication
- Creates user with email/password
- Enables sign-in with these credentials

### ✅ Firestore Database
Creates a document in `users` collection with:
```
{
  uid: "auto-generated-by-firebase",
  email: "your@email.com",
  displayName: "Your Name",
  role: "admin",           // Full admin access
  status: "active",
  isOnline: true,
  permissions: {           // All permissions granted
    accounts: { view: true, create: true, edit: true, delete: true },
    employees: { view: true, create: true, edit: true, delete: true },
    // ... all modules
  },
  createdAt: "2024-01-02T10:00:00Z"
}
```

---

## After First Admin Setup

### Create More Users Via Admin Panel

Once logged in as admin:

1. Go to **Admin → Users Management**
2. Click **Add User**
3. Select role (admin, manager, sales, support, viewer)
4. Enter email and password
5. Click **Create User**

The user can then login with their credentials.

---

## Troubleshooting

### "Invalid Verification Code"
- Check `.env.local` file for `NEXT_PUBLIC_ADMIN_SETUP_CODE`
- Default is `SETUP123`
- For security, change this code and update `.env.local`

### "This email is already registered"
- The email already exists in Firebase Authentication
- Either login with that account or use a different email

### "Password should be at least 6 characters"
- Enter a password with minimum 6 characters
- Recommended: 8+ characters with mix of letters/numbers/symbols

### "Email already in use error" after setup
- You may have created the account but didn't see success message
- Try logging in with those credentials
- If you can't access, contact Firebase Console to delete the user and try again

---

## Environment Configuration

### `.env.local` (Create this file if it doesn't exist)

```bash
# Admin setup verification code
# Change SETUP123 to something secure!
NEXT_PUBLIC_ADMIN_SETUP_CODE=YOUR_SECURE_CODE_HERE

# Firebase config (copy from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# ... other Firebase config

# Email service
RESEND_API_KEY=...
```

---

## User Management After Setup

### User Module Integration

**File**: `/app/admin/users/page.tsx`

Features:
- ✅ Create new users with email/password
- ✅ Assign roles (admin, manager, sales, support, viewer)
- ✅ Edit user details
- ✅ Delete users
- ✅ View active status
- ✅ Manage permissions per role

### Role Permissions

| Feature | Admin | Manager | Sales | Support | Viewer |
|---------|-------|---------|-------|---------|--------|
| **Accounts** | Full | Full | View | Limited | View |
| **Employees** | Full | Full | View | View | View |
| **Users** | Full | View | - | - | - |
| **Reports** | Full | Full | View | - | View |
| **B2B** | Full | Full | Limited | View | - |

---

## Integration With Other Modules

The User Authentication system powers:

### 📦 Accounts Module
- Only users with `accounts.create` permission can create accounts
- Only users with `accounts.delete` permission can delete accounts

### 👥 Employees Module
- Role-based visibility of employee data
- Managers can create/edit employees
- Sales can only view
- Admins have full control

### 📊 Reports Module
- Different reports visible based on role
- Data filtered by permissions

### 🔒 Permission System

Every page/component checks: `<PermissionGate module="name" action="create">`

This ensures:
- UI elements shown only if user has permission
- API calls rejected if unauthorized
- Complete security enforcement

---

## Files Modified/Created

### New Files
- ✅ `/app/admin/setup/page.tsx` - Admin setup page
- ✅ `/USER_AUTHENTICATION_GUIDE.md` - Full documentation

### Modified Files
- ✅ `/app/admin/login/page.tsx` - Added setup link and better error messages
- ✅ `.env.example` - Added setup code configuration

### Existing Files (Used)
- `/app/admin/users/page.tsx` - User management module
- `/app/admin/employees/page.tsx` - Uses role-based access
- `/lib/types.ts` - Permission types and defaults
- `/lib/permissions.ts` - Role and permission helpers

---

## Next Steps

1. **Create your admin account** at `/admin/setup`
2. **Login** at `/admin/login`
3. **Create more users** at Admin → Users Management
4. **Assign roles** to team members
5. **Monitor activity** and permissions

---

## Questions?

Refer to: [USER_AUTHENTICATION_GUIDE.md](./USER_AUTHENTICATION_GUIDE.md)

This comprehensive guide covers:
- ✅ All authentication methods
- ✅ Error troubleshooting
- ✅ Firebase setup
- ✅ Role-based permissions
- ✅ Best practices

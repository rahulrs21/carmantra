# User Authentication Setup Checklist

## 🚀 Quick Setup (5 minutes)

### Step 1: Configure Environment
- [ ] Open `.env.local` file (create if doesn't exist)
- [ ] Add this line: `NEXT_PUBLIC_ADMIN_SETUP_CODE=SETUP123`
- [ ] Save file
- [ ] Restart development server

### Step 2: Create Admin Account
- [ ] Open browser: `http://localhost:3000/admin/setup`
- [ ] Enter code: `SETUP123`
- [ ] Click "Verify & Continue"
- [ ] Fill form:
  - [ ] Display Name: Your name
  - [ ] Email: Your email
  - [ ] Password: 6+ characters
  - [ ] Confirm Password: Same as above
- [ ] Click "Create Admin Account"
- [ ] Wait for redirect to login page

### Step 3: Login to Dashboard
- [ ] Go to: `http://localhost:3000/admin/login`
- [ ] Enter your email from Step 2
- [ ] Enter your password from Step 2
- [ ] Click "Login"
- [ ] Verify you see admin dashboard

---

## 📋 Security Configuration

### Change Default Setup Code (Recommended)
- [ ] Open `.env.local`
- [ ] Find: `NEXT_PUBLIC_ADMIN_SETUP_CODE=SETUP123`
- [ ] Change to: `NEXT_PUBLIC_ADMIN_SETUP_CODE=abc123xyz789def456`
- [ ] Use a combination of letters, numbers, special chars
- [ ] Save file
- [ ] Restart server
- [ ] Setup page will now require new code

### Disable Setup Page After First Admin (Optional)
- [ ] Edit `/app/admin/setup/page.tsx`
- [ ] Change line near top:
  ```tsx
  // Add check to redirect if admin exists
  const isSetupAllowed = process.env.NEXT_PUBLIC_ALLOW_SETUP === 'true';
  if (!isSetupAllowed) redirect('/admin/login');
  ```
- [ ] Add to `.env.local`:
  ```
  NEXT_PUBLIC_ALLOW_SETUP=false
  ```

---

## 👥 Create Additional Users

### Via User Management Module
- [ ] Login to admin dashboard
- [ ] Go to: Admin → Users Management
- [ ] Click "Add User"
- [ ] Fill form:
  - [ ] Email: New user's email
  - [ ] Display Name: User's name
  - [ ] Password: 6+ characters
  - [ ] Role: Select (admin, manager, sales, support, viewer)
- [ ] Click "Create User"
- [ ] User can now login with these credentials

### Assign Appropriate Roles
- [ ] **Admin**: Full system access (use sparingly)
- [ ] **Manager**: Can create/edit employees and view reports
- [ ] **Sales**: Can view accounts and employees
- [ ] **Support**: Limited view access to accounts
- [ ] **Viewer**: Read-only access to reports and data

---

## 🔐 Verify Security Rules

### Check Firebase Security Rules
- [ ] Go to: Firebase Console → Firestore Database → Rules
- [ ] Verify rules include:
  ```firestore
  match /users/{uid} {
    allow read: if request.auth.uid == uid;
    allow write: if isAdmin();
  }
  ```
- [ ] Publish rules if not already published

### Verify User Collection Exists
- [ ] Go to: Firebase Console → Firestore Database → Collections
- [ ] Confirm `users` collection exists
- [ ] Verify first admin document has:
  - [ ] Correct UID (matches Firebase Auth)
  - [ ] email field
  - [ ] role: 'admin'
  - [ ] status: 'active'
  - [ ] permissions array

---

## ✅ Test All Features

### Test Admin Login
- [ ] Login with admin email/password
- [ ] See admin dashboard
- [ ] Can access Users Management

### Test User Creation
- [ ] Create test user with sales role
- [ ] Logout (click user menu → Logout)
- [ ] Login with test user credentials
- [ ] Verify can view accounts only
- [ ] Cannot see admin functions

### Test Role Permissions
- [ ] Login as each role
- [ ] Verify correct modules visible:
  - [ ] **Admin**: All modules
  - [ ] **Manager**: Accounts, Employees, Reports
  - [ ] **Sales**: Accounts, Employees (view only)
  - [ ] **Support**: Accounts (view only)
  - [ ] **Viewer**: Reports (view only)

### Test Error Handling
- [ ] Try login with wrong email
- [ ] Verify error message shows setup link
- [ ] Try login with wrong password
- [ ] Verify same error message
- [ ] Try setup with wrong code
- [ ] Verify rejected with helpful message

---

## 🐛 Troubleshooting

### Issue: "auth/invalid-credential" on login
**Solution**:
- [ ] Create account via `/admin/setup` page
- [ ] Verify email in setup matches login
- [ ] Check password was typed correctly in setup

### Issue: "Invalid verification code"
**Solution**:
- [ ] Check `.env.local` file
- [ ] Look for `NEXT_PUBLIC_ADMIN_SETUP_CODE`
- [ ] Use that exact code on setup page
- [ ] Default is `SETUP123`

### Issue: "Email already registered"
**Solution**:
- [ ] Try logging in with that email instead
- [ ] If forgot password: use "Forgot password?" option
- [ ] Or use different email for new account

### Issue: "Your account is missing a role"
**Solution**:
- [ ] Go to Firebase Console
- [ ] Go to Firestore Database
- [ ] Go to `users` collection
- [ ] Find user document (by UID)
- [ ] Add field: `role` = `admin` (or appropriate role)
- [ ] Save

### Issue: Users can't login after being created
**Solution**:
- [ ] Check that user exists in Firebase Authentication
- [ ] Check user document exists in `users` collection
- [ ] Verify user has a `role` field set
- [ ] Verify role is one of: admin, manager, sales, support, viewer
- [ ] Check Firestore security rules allow access

---

## 📚 Documentation Files

### Quick Reference
- [ ] Read: `USER_AUTHENTICATION_QUICK_FIX.md`
- [ ] Bookmark: `/admin/setup` page link
- [ ] Save: Default setup code `SETUP123`

### Full Documentation
- [ ] Read: `USER_AUTHENTICATION_GUIDE.md`
- [ ] Reference: Role permissions table
- [ ] Review: Best practices section

### Implementation Details
- [ ] Read: `USER_AUTHENTICATION_IMPLEMENTATION.md`
- [ ] Understand: Authentication flow
- [ ] Know: What gets created in Firestore

---

## 🎯 Common Tasks After Setup

### Task 1: Create Team Members
1. [ ] Login as admin
2. [ ] Go to Users Management
3. [ ] For each team member:
   - [ ] Click "Add User"
   - [ ] Enter their email
   - [ ] Assign appropriate role
   - [ ] Send them login credentials

### Task 2: Manage Permissions
1. [ ] Go to Users Management
2. [ ] For each user, you can:
   - [ ] Edit their role
   - [ ] Change permissions
   - [ ] Activate/deactivate account
   - [ ] Delete user

### Task 3: Monitor User Activity
1. [ ] Go to Users Management
2. [ ] Check `isOnline` status
3. [ ] Check `lastLogin` timestamp
4. [ ] Review `createdAt` date
5. [ ] Verify appropriate `status` (active/inactive)

### Task 4: Password Reset
For users who forget password:
1. [ ] User clicks "Forgot password?" on login
2. [ ] Enters their email
3. [ ] Admin receives request
4. [ ] Admin resets password in Firebase Console
5. [ ] Share new password with user

---

## ✨ Pro Tips

### ✅ Best Practices
- [ ] Change setup code to something unique
- [ ] Disable setup page after first admin
- [ ] Regularly audit user roles
- [ ] Use strong passwords (8+ chars, mix of types)
- [ ] Monitor login activity
- [ ] Deactivate unused accounts instead of deleting

### 🔒 Security Tips
- [ ] Never share admin password
- [ ] Don't use same password for multiple accounts
- [ ] Change setup code periodically
- [ ] Review Firestore rules regularly
- [ ] Use email verification for new users
- [ ] Enable 2FA when available

### ⚡ Efficiency Tips
- [ ] Bookmark `/admin/users` for quick access
- [ ] Create role-based templates (copy permissions)
- [ ] Batch create users together
- [ ] Use meaningful display names
- [ ] Document who has which role

---

## 📞 Need Help?

### Quick Answers
1. See: `USER_AUTHENTICATION_QUICK_FIX.md`
2. Check: Troubleshooting section above
3. Review: Error handling in login page

### Detailed Information
1. Read: `USER_AUTHENTICATION_GUIDE.md`
2. Check: Firebase Console docs
3. Review: Code in `/app/admin/setup/page.tsx`

### Technical Issues
1. Check browser console for errors
2. Verify Firebase credentials
3. Check Firestore security rules
4. Confirm environment variables set
5. Restart development server

---

## ✔️ Final Verification

After completing all steps:
- [ ] Admin can login successfully
- [ ] Admin can create new users
- [ ] New users can login
- [ ] Users see appropriate features based on role
- [ ] Error messages are helpful
- [ ] No console errors
- [ ] All modules accessible to admin
- [ ] Limited modules accessible to non-admin roles

🎉 **You're all set!**

---

## Reference

**Setup Page**: `/admin/setup`  
**Login Page**: `/admin/login`  
**Users Module**: `/admin/users`  
**Quick Setup Code**: `SETUP123`  
**Docs Folder**: Root of project

Last Updated: January 2, 2026

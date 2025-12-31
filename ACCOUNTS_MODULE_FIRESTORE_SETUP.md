# Accounts Module - Firestore Setup Guide

## Step 1: Create Required Collections

### Collection 1: `expenses`

**Fields to add in first document**:
```javascript
{
  category: "Spare Parts",
  description: "Engine oil filter replacement",
  amount: 150.00,
  date: Timestamp.now(),
  vendor: "AutoParts Store",
  receiptUrl: "",
  createdAt: Timestamp.now()
}
```

**Steps**:
1. Go to Firebase Console → Firestore Database
2. Click "Create collection"
3. Name it: `expenses`
4. Add the first document with above structure
5. Document ID can be auto-generated

---

### Collection 2: `attendance`

**Fields to add in first document**:
```javascript
{
  staffId: "staff_id_here",
  staffName: "John Doe",
  date: Timestamp.now(),
  checkIn: Timestamp.now(),
  checkOut: null,
  status: "present",
  workingHours: 8,
  notes: "Regular day",
  updatedAt: Timestamp.now()
}
```

**Steps**:
1. Click "Create collection"
2. Name it: `attendance`
3. Use document ID format: `{staffId}_{YYYY-MM-DD}` 
   - Example: `staff123_2024-01-15`
4. Add the first document with above structure

---

### Collection 3: `salaries`

**Fields to add in first document**:
```javascript
{
  staffId: "staff_id_here",
  staffName: "John Doe",
  month: "2024-01",
  basicSalary: 5000.00,
  allowances: 500.00,
  deductions: 250.00,
  netSalary: 5250.00,
  workingDays: 20,
  status: "paid",
  createdAt: Timestamp.now(),
  paidDate: Timestamp.now(),
  paymentMethod: "bank_transfer",
  transactionId: "TXN12345",
  notes: "January 2024 salary"
}
```

**Steps**:
1. Click "Create collection"
2. Name it: `salaries`
3. Use document ID format: `{staffId}_{YYYY-MM}`
   - Example: `staff123_2024-01`
4. Add the first document with above structure

---

## Step 2: Configure Firestore Indexes

Navigate to Firestore → Indexes tab and create the following composite indexes:

### Index 1: Expenses by Category and Date
```
Collection: expenses
Fields:
  - category (Ascending)
  - date (Descending)
```

### Index 2: Expenses by Date Only
```
Collection: expenses
Fields:
  - date (Descending)
```

### Index 3: Attendance by StaffId and Date
```
Collection: attendance
Fields:
  - staffId (Ascending)
  - date (Descending)
```

### Index 4: Attendance by Date
```
Collection: attendance
Fields:
  - date (Descending)
```

### Index 5: Salaries by StaffId and Month
```
Collection: salaries
Fields:
  - staffId (Ascending)
  - month (Descending)
```

### Index 6: Salaries by Month and Status
```
Collection: salaries
Fields:
  - month (Descending)
  - status (Ascending)
```

---

## Step 3: Update Firestore Security Rules

Replace your current Firestore rules with the following (or merge if you already have rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check user role
    function hasRole(roles) {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in roles;
    }
    
    // Helper function to check module access
    function hasModuleAccess(module) {
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
      return request.auth != null && (
        userDoc.role == 'admin' || 
        userDoc.modules[module] != null
      );
    }
    
    // Users Collection
    match /users/{uid} {
      allow read: if request.auth.uid == uid || request.auth != null;
      allow write: if request.auth.uid == uid || hasRole(['admin']);
    }
    
    // Invoices Collection (existing - add payments section)
    match /invoices/{document=**} {
      allow create: if request.auth != null && hasRole(['admin', 'accounts_manager']);
      allow read: if request.auth != null;
      allow update: if request.auth != null && hasRole(['admin', 'accounts_manager']);
      allow delete: if request.auth != null && hasRole(['admin']);
    }
    
    // Expenses Collection (NEW)
    match /expenses/{document=**} {
      allow create: if request.auth != null && 
                      (hasRole(['admin', 'accounts_manager']) || 
                       hasModuleAccess('accounts'));
      allow read: if request.auth != null && 
                     (hasRole(['admin', 'accounts_manager']) || 
                      hasModuleAccess('accounts'));
      allow update: if request.auth != null && 
                       (hasRole(['admin', 'accounts_manager']) || 
                        hasModuleAccess('accounts'));
      allow delete: if request.auth != null && 
                       (hasRole(['admin', 'accounts_manager']) || 
                        hasModuleAccess('accounts'));
    }
    
    // Attendance Collection (NEW)
    match /attendance/{document=**} {
      allow create: if request.auth != null && 
                      (hasRole(['admin', 'hr_manager']) || 
                       hasModuleAccess('accounts'));
      allow read: if request.auth != null;
      allow update: if request.auth != null && 
                       (hasRole(['admin', 'hr_manager']) || 
                        hasModuleAccess('accounts'));
      allow delete: if request.auth != null && 
                       hasRole(['admin', 'hr_manager']);
    }
    
    // Salaries Collection (NEW)
    match /salaries/{document=**} {
      allow create: if request.auth != null && 
                      (hasRole(['admin', 'hr_manager']) || 
                       hasModuleAccess('accounts'));
      allow read: if request.auth != null && 
                     (hasRole(['admin', 'hr_manager']) || 
                      hasModuleAccess('accounts') ||
                      request.auth.uid == get(/databases/$(database)/documents/salaries/$(document)).data.staffId);
      allow update: if request.auth != null && 
                       (hasRole(['admin', 'hr_manager']) || 
                        hasModuleAccess('accounts'));
      allow delete: if request.auth != null && hasRole(['admin']);
    }
    
    // Staff Collection (existing)
    match /staff/{document=**} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null && hasRole(['admin']);
    }
    
    // Default deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Step 4: Update Staff Collection (if needed)

Ensure your `staff` collection includes the `basicSalary` field:

```javascript
{
  name: "John Doe",
  email: "john@example.com",
  position: "Mechanic",
  basicSalary: 5000.00,  // ADD THIS if not present
  phone: "+971xxxxxxxxx",
  joinDate: Timestamp.now(),
  status: "active"
}
```

To update existing staff documents:
1. Go to Firestore → staff collection
2. Edit each document
3. Add `basicSalary` field with numeric value
4. Save

---

## Step 5: Test the Setup

### Test Payment History
1. Go to Admin → Accounts → Payment History
2. You should see existing invoices
3. Try filtering and searching

### Test Expense Management
1. Go to Admin → Accounts → Expense Management
2. Click "+ Add Expense"
3. Fill in form and submit
4. Should appear in table below

### Test Staff Attendance
1. Go to Admin → Accounts → Staff Attendance
2. Select a date
3. You should see staff members from `staff` collection
4. Click "✓ Present" or "✕ Absent"
5. Status should update in real-time

### Test Salary Management
1. Go to Admin → Accounts → Salary Management
2. Select a month
3. Click "📊 Calculate Salaries"
4. Should calculate for all staff in collection
5. View calculated salaries in table

---

## Step 6: Verify Database Structure

Use this checklist to ensure all collections are properly configured:

### Expenses Collection ✓
- [ ] Collection created
- [ ] At least one test document added
- [ ] Fields: category, description, amount, date, vendor, createdAt
- [ ] Date field is Timestamp type

### Attendance Collection ✓
- [ ] Collection created
- [ ] At least one test document added
- [ ] Fields: staffId, staffName, date, checkIn, status, updatedAt
- [ ] Document ID format: `{staffId}_{YYYY-MM-DD}`
- [ ] Date field is Timestamp type

### Salaries Collection ✓
- [ ] Collection created
- [ ] At least one test document added
- [ ] Fields: staffId, month, basicSalary, allowances, deductions, netSalary, status, createdAt
- [ ] Document ID format: `{staffId}_{YYYY-MM}`
- [ ] Month field format: "YYYY-MM"

### Staff Collection (Updated) ✓
- [ ] All staff documents have `basicSalary` field
- [ ] basicSalary is numeric type
- [ ] Staff documents have email and name fields

### Invoices Collection (Existing) ✓
- [ ] Has paymentStatus field
- [ ] Has paymentMethod field
- [ ] Has total field
- [ ] Has partialPaidAmount for partial payments

---

## Troubleshooting

### "Permission denied" error
- Check user role in `users` collection
- Verify `hasModuleAccess('accounts')` is working
- Ensure Firestore rules are deployed

### "No such document" error
- Verify collections are created with exact names
- Check document ID format for attendance and salaries
- Ensure staff documents exist

### Salary calculation shows 0
- Verify staff have `basicSalary` > 0
- Check attendance records exist for the month
- Look for query errors in browser console

### Data not loading
- Check Firestore rules allow read access
- Verify collection names match exactly (case-sensitive)
- Check user is authenticated

### Indexes pending
- Give Firestore 5-10 minutes to build indexes
- Large collections may take longer
- Refresh page after indexes are created

---

## Sample Data for Testing

### Sample Expense
```javascript
{
  category: "Spare Parts",
  description: "4 pcs air filters",
  amount: 320.50,
  vendor: "Gulf Auto Parts",
  date: timestamp(Jan 15, 2024),
  createdAt: timestamp(Jan 15, 2024)
}
```

### Sample Attendance
```javascript
{
  staffId: "mechanic_001",
  staffName: "Ahmed Ali",
  date: timestamp(Jan 15, 2024),
  checkIn: timestamp(Jan 15, 2024, 08:00),
  checkOut: timestamp(Jan 15, 2024, 17:00),
  status: "present",
  workingHours: 9,
  updatedAt: timestamp(Jan 15, 2024)
}
```

### Sample Salary
```javascript
{
  staffId: "mechanic_001",
  staffName: "Ahmed Ali",
  month: "2024-01",
  basicSalary: 4500,
  allowances: 450,
  deductions: 225,
  netSalary: 4725,
  workingDays: 22,
  status: "paid",
  createdAt: timestamp(Jan 31, 2024),
  paidDate: timestamp(Feb 1, 2024),
  paymentMethod: "bank_transfer",
  transactionId: "TXN2024010001"
}
```

---

## Deployment Checklist

Before going to production:

- [ ] All collections created
- [ ] All indexes created and built
- [ ] Firestore rules deployed
- [ ] Staff collection has basicSalary
- [ ] Test data added to each collection
- [ ] All 4 modules tested
- [ ] Permissions working correctly
- [ ] Mobile responsive design tested
- [ ] No console errors
- [ ] Backup created of existing data

---

## Firestore Rules Reference

**Roles that can access Accounts Module**:
- `admin` - Full access
- `accounts_manager` - Manage payments and expenses
- `hr_manager` - Manage attendance and salaries
- Users with `modules.accounts` permission

**Permission Matrix**:

| Action | Admin | Accounts Manager | HR Manager | Regular User |
|--------|-------|------------------|-----------|--------------|
| View Payments | ✓ | ✓ | ✓ | ✗ |
| View Expenses | ✓ | ✓ | ✓ | ✗ |
| Add Expense | ✓ | ✓ | ✗ | ✗ |
| View Attendance | ✓ | ✓ | ✓ | ✓ |
| Mark Attendance | ✓ | ✓ | ✓ | ✗ |
| View Salaries | ✓ | ✗ | ✓ | Own only |
| Calculate Salaries | ✓ | ✗ | ✓ | ✗ |
| Record Payment | ✓ | ✗ | ✓ | ✗ |


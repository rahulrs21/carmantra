# Employee Module - Quick Reference Guide

## What Was Built

Complete employee management system with:
- **View/Edit employee profiles** with basic information
- **Document management** (upload, download, delete)
- **Employee account setup** with role-based access
- **Firestore security rules** for data protection

## Key Files

| File | Purpose |
|------|---------|
| [app/admin/employees/[id]/page.tsx](app/admin/employees/[id]/page.tsx) | Main employee detail page with 3 tabs |
| [firestore.rules](firestore.rules) | Security rules for access control |
| [EMPLOYEE_MODULE_COMPLETE.md](EMPLOYEE_MODULE_COMPLETE.md) | Full documentation |

## Features at a Glance

### Tab 1: Basic Information
- View employee profile
- Edit name, email, phone, department, position, joining date, status
- Save changes with validation

### Tab 2: Visa & Documents  
- Upload: Passport, Emirates ID, Visa, Other Documents
- Download documents from storage
- Delete documents with confirmation
- Supported formats: PDF, JPG, PNG (max 10MB)

### Tab 3: User Account
- Create login account with email and password
- Assign role: Employee or Staff
- View account status and permissions
- Disable account when needed

## Database Collections

```
employees/                  - Employee basic info
  ├─ id, name, email, phone
  ├─ department, position
  ├─ joiningDate, status
  └─ timestamps

employeeDocuments/          - Uploaded documents
  ├─ employeeId, type
  ├─ fileName, storagePath
  ├─ size, uploadedAt
  └─ auto-indexed by employeeId

users/                      - Login accounts
  ├─ employeeId, email
  ├─ role ('employee'|'staff'|'admin'|'manager')
  ├─ status ('active'|'inactive')
  └─ timestamps
```

## Firebase Storage
```
employeeDocuments/
  └─ {employeeId}/
     ├─ {employeeId}_passport_{timestamp}
     ├─ {employeeId}_emirates_id_{timestamp}
     └─ {employeeId}_visa_{timestamp}
```

## Key Functions

```typescript
// Document Management
handleDocumentUpload(file, docType)     // Upload with validation
handleDownloadDocument(doc)              // Download from storage
handleDeleteDocument(docItem)            // Delete from storage & DB
fetchDocuments()                         // Load employee's documents

// Account Management
handleSetupAccount()                     // Create/update user account
handleDisableAccount()                   // Deactivate account

// Employee Info
handleSave()                             // Save employee changes
```

## Security Rules Applied

✅ **Employees Collection**: Admin/Manager write, Employees read own
✅ **Documents Collection**: Owner/Manager/Admin access
✅ **Users Collection**: Admin only
✅ **Attendance Collection**: Role-based access

## Validation Rules

| Field | Rule |
|-------|------|
| Document File Type | PDF, JPG, PNG only |
| Document Size | Max 10MB |
| Password | Min 6 characters |
| Password Confirm | Must match password |
| Name | Required |
| Department | Required |
| Position | Required |

## User Roles & Permissions

### Admin/Manager
- ✅ View all employees
- ✅ Edit employee info
- ✅ Manage documents
- ✅ Create/disable accounts
- ✅ Assign roles

### Employee
- ✅ View own profile
- ✅ View own documents
- ❌ Edit own info
- ❌ Manage account

### Staff
- ✅ Access staff portal
- ✅ View team data
- ❌ Manage documents
- ❌ Create accounts

## How to Use

### 1. View Employee Details
```
1. Go to /admin/employees
2. Click "View" button on any employee
3. Opens employee detail page at /admin/employees/[id]
```

### 2. Upload Document
```
1. Click "Visa & Documents" tab
2. Click document type button (Passport, Emirates ID, etc.)
3. Select file (max 10MB, PDF/JPG/PNG)
4. File uploads and appears in documents list
```

### 3. Create Employee Account
```
1. Click "User Account" tab
2. Click "Create Account" button
3. Enter email, password (min 6 chars)
4. Select role (Employee or Staff)
5. Click "Create Account"
6. Account is now active for login
```

### 4. Download Document
```
1. In "Visa & Documents" tab
2. Find document in list
3. Click "Download" button
4. File downloads to device
```

### 5. Delete Document
```
1. In "Visa & Documents" tab
2. Click red delete button on document
3. Confirm deletion
4. Document removed from storage and database
```

## API Endpoints (Firestore)

```
GET  /employees/{id}              - Fetch employee details
PUT  /employees/{id}              - Update employee info
GET  /employeeDocuments?emp={id}  - List documents
POST /employeeDocuments           - Create document record
DEL  /employeeDocuments/{id}      - Delete document record
GET  /users?emp={id}              - Get user account
POST /users                       - Create user account
PUT  /users/{id}                  - Update user account
DEL  /users/{id}                  - Delete user account
```

## Error Messages & Fixes

| Error | Fix |
|-------|-----|
| "File type not allowed" | Use PDF, JPG, or PNG format |
| "File too large" | Keep file under 10MB |
| "Password must be 6+ chars" | Enter password with 6+ characters |
| "Passwords don't match" | Confirm password must match password field |
| "Employee not found" | Employee may have been deleted |
| "Permission denied" | You may lack admin/manager role |

## Testing Checklist

```
Document Management:
☑ Upload valid PDF/JPG/PNG file
☑ Reject invalid file types
☑ Reject files over 10MB
☑ Download uploaded document
☑ Delete document with confirmation
☑ See document list with metadata

Account Management:
☑ Create new account with valid email/password
☑ See account status when enabled
☑ Update existing account
☑ Role selection shows correct permissions
☑ Disable account successfully
☑ Password validation (6+ chars)
☑ Password confirmation matching

Employee Info:
☑ View all employee details
☑ Edit and save changes
☑ Cancel edit without saving
☑ Form validation for required fields
☑ Proper date formatting
```

## Support

See full documentation in:
- [EMPLOYEE_MODULE_COMPLETE.md](EMPLOYEE_MODULE_COMPLETE.md) - Comprehensive guide
- [EMPLOYEE_MODULE_IMPLEMENTATION_COMPLETE.md](EMPLOYEE_MODULE_IMPLEMENTATION_COMPLETE.md) - Implementation details

## Implementation Status

✅ Document management - COMPLETE
✅ Account setup - COMPLETE
✅ Security rules - COMPLETE
✅ Error handling - COMPLETE
✅ Validation - COMPLETE
✅ UI/UX - COMPLETE
✅ Documentation - COMPLETE

**Module Status: READY FOR PRODUCTION** 🚀

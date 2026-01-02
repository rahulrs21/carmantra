# Employee Module Menu Structure - Complete Reference

## 🎯 Sidebar Navigation by Role

### 👤 EMPLOYEE ROLE (Employee User)

```
┌─────────────────────────────────┐
│  CarMantra CRM                  │
├─────────────────────────────────┤
│                                 │
│ 📊 Dashboard                    │ ← View only (company overview)
│                                 │
│ 👥 Leads                        │ ← View, Create, Edit own leads
│                                 │
│ 👨‍💼 Customers                    │ ← View only
│                                 │
│ 📋 Quotation                    │ ← View, Create, Edit own quotes
│                                 │
│ 📄 Invoice                      │ ← View only
│                                 │
│ 👨‍💼 Employees                    │ ← View own information (read-only)
│   • All Employees (own info)    │
│   • Attendance (view)           │
│                                 │
│ 🍃 Leaves ⭐ NEW               │ ← Apply for leave, track requests
│   • Apply for Leave button      │
│   • View all pending/approved   │
│                                 │
│ 💰 Salary ⭐ NEW               │ ← View salary records
│   • View monthly salary         │
│   • Download salary slip        │
│                                 │
│ 👤 My Account                   │ ← Personal account settings
│                                 │
└─────────────────────────────────┘

PERMISSIONS SUMMARY:
✅ Can Access: Dashboard, Leads, Customers, Quotations, Invoices, Employees, Leaves, Salary
❌ Cannot Access: Book Service, B2B Booking, Services, Accounts, Users
```

---

### 👨‍💼 MANAGER ROLE (Manager User)

```
┌─────────────────────────────────┐
│  CarMantra CRM                  │
├─────────────────────────────────┤
│                                 │
│ 📊 Dashboard                    │ ← View only
│                                 │
│ 👥 Leads                        │ ← Full CRUD (View, Create, Edit, Delete)
│                                 │
│ 👨‍💼 Customers                    │ ← Full CRUD
│                                 │
│ 🔧 Book Service                 │ ← Full CRUD
│                                 │
│ 📦 B2B Booking                  │ ← Full CRUD
│                                 │
│ ⚙️ Services                     │ ← Full CRUD
│                                 │
│ 📋 Quotation                    │ ← Full CRUD
│                                 │
│ 📄 Invoice                      │ ← Full CRUD
│                                 │
│ 💳 Accounts                     │ ← Full CRUD
│                                 │
│ ✉️ Send Form                    │ ← Access
│                                 │
│ 👨‍💼 Employees                    │ ← Full CRUD + Management
│   • All Employees               │
│   • Attendance                  │
│   • (Can manage leaves & salary)│
│                                 │
│ 🍃 Leaves                       │ ← Approve/Reject requests
│                                 │
│ 💰 Salary                       │ ← Add/Edit salary records
│                                 │
│ 👤 My Account                   │ ← Personal settings
│                                 │
└─────────────────────────────────┘

PERMISSIONS SUMMARY:
✅ Full Access to: All modules
✅ Special: Can approve/reject employee leaves
✅ Special: Can add/edit employee salary records
```

---

### 🔐 ADMIN ROLE (Admin User)

```
┌─────────────────────────────────┐
│  CarMantra CRM                  │
├─────────────────────────────────┤
│                                 │
│ 📊 Dashboard                    │ ← Full access (all stats)
│                                 │
│ 👥 Leads                        │ ← Full CRUD (View, Create, Edit, Delete)
│                                 │
│ 👨‍💼 Customers                    │ ← Full CRUD
│                                 │
│ 🔧 Book Service                 │ ← Full CRUD
│                                 │
│ 📦 B2B Booking                  │ ← Full CRUD
│                                 │
│ ⚙️ Services                     │ ← Full CRUD
│                                 │
│ 📋 Quotation                    │ ← Full CRUD
│                                 │
│ 📄 Invoice                      │ ← Full CRUD
│                                 │
│ 💳 Accounts                     │ ← Full CRUD
│                                 │
│ ✉️ Send Form                    │ ← Full access
│                                 │
│ 👥 Users                        │ ← Create, Manage roles, Permissions
│                                 │
│ 👨‍💼 Employees                    │ ← Full CRUD + Management
│   • All Employees (list + stats)│
│   • Create/Edit/Delete          │
│   • Attendance                  │
│   • [Add Employee button]       │
│                                 │
│ 🍃 Leaves                       │ ← Full Management
│   • View all requests           │
│   • Approve/Reject              │
│   • Set approval status         │
│                                 │
│ 💰 Salary                       │ ← Full Management
│   • Add salary records          │
│   • Edit records                │
│   • Track payments              │
│                                 │
│ 👤 My Account                   │ ← Personal settings
│                                 │
└─────────────────────────────────┘

PERMISSIONS SUMMARY:
✅ Full Access: All modules
✅ Special: Complete system administration
✅ Special: User and role management
✅ Special: Employee and leave management
✅ Special: Salary and compensation
```

---

## 📍 Route Mapping

### Employee Routes
| Route | Page | Access | Purpose |
|-------|------|--------|---------|
| `/admin` | Dashboard | View | Company overview |
| `/admin/leads` | Leads List | View, Create, Edit | Lead management |
| `/admin/customers` | Customers | View | Customer info |
| `/admin/quotation` | Quotations | View, Create, Edit | Quote management |
| `/admin/invoice` | Invoices | View | Invoice viewing |
| `/admin/employees` | My Information | View | Personal employee info |
| `/admin/employees/[id]` | Employee Detail | View | Own detail page |
| `/admin/employees/attendance` | Attendance | View | Personal attendance |
| **`/admin/my-leaves`** ⭐ | My Leaves | View, Create | Leave management |
| **`/admin/my-salary`** ⭐ | My Salary | View | Salary records |
| `/admin/account` | My Account | Full | Account settings |

### Admin/Manager Routes
| Route | Page | Access | Purpose |
|-------|------|--------|---------|
| `/admin` | Dashboard | Full | System overview |
| `/admin/leads` | Leads | Full CRUD | Lead management |
| `/admin/customers` | Customers | Full CRUD | Customer management |
| `/admin/book-service` | Book Service | Full CRUD | Service booking |
| `/admin/b2b-booking` | B2B Booking | Full CRUD | B2B management |
| `/admin/services` | Services | Full CRUD | Service catalog |
| `/admin/quotation` | Quotations | Full CRUD | Quote management |
| `/admin/invoice` | Invoices | Full CRUD | Invoice management |
| `/admin/accounts` | Accounts | Full CRUD | Account management |
| `/admin/send-form` | Send Form | Full | Form distribution |
| `/admin/users` | Users | Manage | User management |
| `/admin/employees` | Employees | Full CRUD + Stats | Employee management |
| `/admin/employees/[id]` | Employee Detail | Full | Employee profile |
| `/admin/employees/attendance` | Attendance | Manage | Attendance tracking |
| `/admin/employees/leaves` | Leaves (Admin) | Manage | Approve/Reject leaves |
| `/admin/employees/salary` | Salary (Admin) | Manage | Add/Edit salaries |
| **`/admin/my-leaves`** ⭐ | My Leaves | View | Personal leave tracking |
| **`/admin/my-salary`** ⭐ | My Salary | View | Personal salary viewing |
| `/admin/account` | My Account | Full | Account settings |

---

## 🔄 Navigation Flow

### Employee Journey
```
Login
  ↓
Dashboard (Overview)
  ↓
  ├─→ Leads (View/Create/Edit)
  ├─→ Quotations (View/Create/Edit)
  ├─→ My Information (View)
  ├─→ Leaves (View/Apply) ⭐
  ├─→ Salary (View/Download) ⭐
  └─→ My Account (Settings)
```

### Admin Journey
```
Login
  ↓
Dashboard (Full Stats)
  ↓
  ├─→ Leads (Full Management)
  ├─→ Employees (Full Management + Actions)
  │   ├─→ Create/Edit/Delete Employee
  │   ├─→ View Employee Details
  │   ├─→ Manage Attendance
  │   └─→ [Advanced: Leaves & Salary management]
  ├─→ Leaves (Approve/Reject) ⭐
  ├─→ Salary (Add/Edit) ⭐
  ├─→ Users (Manage roles)
  └─→ Other Modules (Full CRUD)
```

---

## 🎨 Menu Icons

```
📊 Dashboard      - Chart/Home icon
👥 Leads          - Multiple people icon
👨‍💼 Customers       - Person icon
🔧 Book Service   - Wrench/Calendar icon
📦 B2B Booking    - Package/Building icon
⚙️ Services       - Gear/Settings icon
📋 Quotation      - Document/Paper icon
📄 Invoice        - Document/File icon
💳 Accounts       - Credit card icon
✉️ Send Form      - Envelope/Mail icon
👥 Users          - Multiple people icon
👨‍💼 Employees       - People/Team icon
🍃 Leaves         - Leaf icon (NEW)
💰 Salary         - Money/Coin icon (NEW)
👤 My Account     - Single person icon
```

---

## 📱 Mobile View

**Menu collapses into hamburger menu on mobile:**

```
[☰]  CarMantra CRM          [🌙] [👤]

When menu open:
┌────────────────────────┐
│ [×] Menu               │
├────────────────────────┤
│ 📊 Dashboard           │
│ 👥 Leads               │
│ 👨‍💼 Customers             │
│ ...                    │
│ 🍃 Leaves              │
│ 💰 Salary              │
│ 👤 My Account          │
└────────────────────────┘
```

---

## 🔐 Permission Enforcement

### At UI Level
- Menu items filtered by role
- Buttons hidden based on permissions
- Forms disabled for read-only roles
- Action buttons (Edit/Delete) hidden for unauthorized users

### At Data Level
- Firestore rules enforce access
- Employee data queries filtered by UID
- Leave/Salary records filtered by employeeId
- Deletion prevented for unauthorized users

---

## ✅ Implementation Complete

All menu structures, routes, and permission-based access have been implemented and are fully functional!

**Status**: 🟢 Production Ready

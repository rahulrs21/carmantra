# Accounts Management Module - Implementation Guide

## Overview

The Accounts Management Module is a comprehensive financial management system for the CarMantra B2B platform. It consists of a main dashboard and 4 specialized sub-modules for managing payments, expenses, staff attendance, and payroll.

## Module Structure

```
/app/admin/accounts/
├── page.tsx                 # Main dashboard with financial KPIs
├── payments/
│   └── page.tsx            # Payment History - Track invoice payments
├── expenses/
│   └── page.tsx            # Expense Management - Record business expenses
├── attendance/
│   └── page.tsx            # Staff Attendance - Daily attendance tracking
└── salary/
    └── page.tsx            # Salary Management - Payroll and salary slips
```

## Features by Module

### 1. **Payment History** (`/admin/accounts/payments`)

**Purpose**: Track all invoice payments and financial transactions

**Key Features**:
- View all paid, partial, and unpaid invoices
- Search by invoice number, customer name, or vehicle details
- Filter by payment status (All, Paid, Partial, Unpaid)
- Filter by payment method (Cash, Card, Online, Bank Transfer)
- Display summary statistics:
  - Total records
  - Total amount paid
  - Count of paid records
- Quick link to view full invoice
- Responsive table design (desktop & mobile)

**Data Model**:
```typescript
interface Payment {
  id: string;
  invoiceNumber: string;
  customerName: string;
  serviceCategory?: string;
  vehicleDetails?: string;
  paymentMethod: 'cash' | 'card' | 'online' | 'bank_transfer';
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentDate?: Timestamp;
  createdAt?: Timestamp;
  invoiceId?: string;
}
```

**Database Collection**: `invoices` (existing)

---

### 2. **Expense Management** (`/admin/accounts/expenses`)

**Purpose**: Record and track business expenses

**Key Features**:
- Add new expenses with form validation
- Expense categories (Spare Parts, Tools, Rent, Utilities, Staff Salary, Marketing, Insurance, Maintenance, Office Supplies, Transportation, Other)
- Store vendor/supplier information
- Track expense dates
- Search expenses by description or vendor
- Filter by expense category
- Display statistics:
  - Current month expenses
  - Total expenses (all-time)
  - Number of categories used
- Delete expenses with confirmation
- Permission-based access control

**Data Model**:
```typescript
interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Timestamp;
  vendor?: string;
  receiptUrl?: string;
  createdAt: Timestamp;
}
```

**Database Collection**: `expenses` (new)

**Expense Categories**:
- Spare Parts
- Tools & Equipment
- Rent & Utilities
- Staff Salary
- Marketing & Advertising
- Insurance
- Maintenance
- Office Supplies
- Transportation
- Other

---

### 3. **Staff Attendance** (`/admin/accounts/attendance`)

**Purpose**: Track daily staff attendance and working hours

**Key Features**:
- Date-based attendance marking
- Mark attendance status: Present, Absent, Half-day, Leave
- Quick check-in timestamp recording
- Real-time statistics:
  - Total staff count
  - Present today
  - Absent today
  - Not yet marked today
- Monthly attendance summary:
  - Present days count
  - Absent days count
  - Half days count
  - Leave count
- Bulk attendance marking for all staff
- Working hours calculation
- Month-view summary reports

**Data Model**:
```typescript
interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: Timestamp;
  checkIn?: Timestamp;
  checkOut?: Timestamp;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  workingHours?: number;
  notes?: string;
}
```

**Database Collections**: 
- `attendance` (new) - stores attendance records
- `staff` (existing) - fetches staff member list

---

### 4. **Salary Management** (`/admin/accounts/salary`)

**Purpose**: Manage staff payroll and generate salary slips

**Key Features**:
- Calculate salaries for selected month
- Auto-calculate based on:
  - Basic salary from staff records
  - Allowances (10% of basic)
  - Deductions (5% of basic)
  - Working days from attendance records
- Record salary payment details:
  - Payment method (Bank Transfer, Check, Cash)
  - Transaction ID / Check number
  - Payment notes
- Mark salaries as paid with timestamp
- Display salary breakdown per staff:
  - Basic salary
  - Allowances
  - Deductions
  - Net salary
  - Payment status
- Monthly statistics:
  - Total payroll amount
  - Paid count / Total count
  - Pending payment amount
- Average salary calculations
- Status tracking: Draft, Calculated, Approved, Paid

**Data Model**:
```typescript
interface StaffSalary {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  workingDays: number;
  status: 'draft' | 'calculated' | 'approved' | 'paid';
  createdAt: Timestamp;
  paidDate?: Timestamp;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}
```

**Database Collections**:
- `salaries` (new) - stores salary records
- `staff` (existing) - fetches staff basic salary
- `attendance` (new) - calculates working days

---

## Dashboard Features

**Main Dashboard** (`/admin/accounts/page.tsx`)

**KPI Cards** (Real-time calculated):
1. **Monthly Income**: Sum of all paid invoices in current month
2. **Monthly Expenses**: Sum of all recorded expenses in current month
3. **Outstanding Payments**: Total amount of unpaid and partial invoices
4. **Net Profit**: Monthly Income minus Monthly Expenses

**Module Navigation**:
- 4 colored module cards with icons
- Quick access to each sub-module
- Hover effects and visual feedback
- Permission-based access control

**Quick Actions**:
- Add Expense
- Mark Attendance
- View Salary Details

---

## Database Schema

### Firestore Collections

#### 1. **expenses** (New Collection)

```javascript
{
  category: string,
  description: string,
  amount: number,
  date: Timestamp,
  vendor: string (optional),
  receiptUrl: string (optional),
  createdAt: Timestamp
}
```

**Indexes Recommended**:
- `date` (ascending)
- `category` (ascending)
- Composite: `category` + `date`

---

#### 2. **attendance** (New Collection)

```javascript
{
  staffId: string,
  staffName: string,
  date: Timestamp,
  checkIn: Timestamp (optional),
  checkOut: Timestamp (optional),
  status: string ('present' | 'absent' | 'half_day' | 'leave'),
  workingHours: number (optional),
  notes: string (optional),
  updatedAt: Timestamp
}
```

**Document ID Format**: `{staffId}_{dateString}` (e.g., "staff123_2024-01-15")

**Indexes Recommended**:
- Composite: `staffId` + `date`
- `date` (descending)

---

#### 3. **salaries** (New Collection)

```javascript
{
  staffId: string,
  staffName: string,
  month: string (YYYY-MM format),
  basicSalary: number,
  allowances: number,
  deductions: number,
  netSalary: number,
  workingDays: number,
  status: string ('draft' | 'calculated' | 'approved' | 'paid'),
  createdAt: Timestamp,
  paidDate: Timestamp (optional),
  paymentMethod: string (optional),
  transactionId: string (optional),
  notes: string (optional)
}
```

**Document ID Format**: `{staffId}_{monthString}` (e.g., "staff123_2024-01")

**Indexes Recommended**:
- Composite: `staffId` + `month`
- `month` (descending)
- `status` (ascending)

---

#### 4. **invoices** (Existing - Used for Payment History)

Fields utilized:
- `invoiceNumber`: string
- `customerName`: string
- `serviceCategory`: string
- `vehicleDetails`: object
- `paymentStatus`: 'paid' | 'partial' | 'unpaid'
- `paymentMethod`: string
- `total`: number
- `partialPaidAmount`: number (for partial payments)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

---

#### 5. **staff** (Existing - Used for Attendance & Salary)

Fields utilized:
- `name`: string
- `email`: string
- `position`: string (optional)
- `basicSalary`: number (required for salary module)

---

## Firestore Rules Configuration

Add these rules to your Firestore security rules:

```javascript
// Expenses Collection
match /expenses/{document=**} {
  allow create: if request.auth != null && hasRole(['admin', 'accounts_manager']);
  allow read: if request.auth != null && hasRole(['admin', 'accounts_manager']);
  allow update, delete: if request.auth != null && hasRole(['admin', 'accounts_manager']);
}

// Attendance Collection
match /attendance/{document=**} {
  allow create: if request.auth != null && hasRole(['admin', 'hr_manager']);
  allow read: if request.auth != null;
  allow update, delete: if request.auth != null && hasRole(['admin', 'hr_manager']);
}

// Salaries Collection
match /salaries/{document=**} {
  allow create: if request.auth != null && hasRole(['admin', 'hr_manager']);
  allow read: if request.auth != null && (hasRole(['admin', 'hr_manager']) || request.auth.uid == resource.data.staffId);
  allow update, delete: if request.auth != null && hasRole(['admin', 'hr_manager']);
}
```

---

## Integration Points

### With Existing Modules

1. **Invoice Management**:
   - Payment History reads from `invoices` collection
   - Updates payment status and payment method
   - Links to full invoice PDFs

2. **Staff Management**:
   - Attendance reads staff list from `staff` collection
   - Salary reads basic salary from `staff` collection
   - Both update staff-related data

3. **Authentication**:
   - Uses existing PermissionGate component
   - Role-based access control with module="accounts"

### Data Flow Diagram

```
Dashboard (Main Entry Point)
  ├── Payment History
  │   └── Reads: invoices collection
  │       Actions: View, Search, Filter, Export
  │
  ├── Expense Management
  │   ├── Reads: expenses collection
  │   └── Writes: expenses collection
  │       Actions: Create, Read, Update, Delete, Search, Filter
  │
  ├── Staff Attendance
  │   ├── Reads: staff, attendance collections
  │   └── Writes: attendance collection
  │       Actions: Mark Present/Absent/Half-day/Leave, View Reports
  │
  └── Salary Management
      ├── Reads: staff, attendance, salaries collections
      ├── Writes: salaries collection
      └── Actions: Calculate, Update, Mark Paid, View Reports
```

---

## Permission Requirements

Users need the following permission to access Accounts Module:

```typescript
// In PermissionGate
module="accounts"

// Actions Required:
- "view": View payments, expenses, attendance, salaries
- "create": Add expenses, mark attendance, calculate salaries
- "update": Update salary payment status
- "delete": Delete expenses
- "export": Export payment and expense reports
```

---

## Usage Instructions

### 1. Payment History
1. Navigate to Accounts → Payment History
2. Use search to find specific invoices
3. Filter by payment status or method
4. Click "View Invoice" to see full invoice details
5. Click "📊 Export Report" to download payment summary

### 2. Expense Management
1. Navigate to Accounts → Expense Management
2. Click "+ Add Expense" button
3. Select expense category
4. Enter amount, description, vendor, and date
5. Click "Save Expense"
6. View all expenses in the table
7. Filter by category or search by description
8. Click "Delete" to remove an expense

### 3. Staff Attendance
1. Navigate to Accounts → Staff Attendance
2. Select date using date picker
3. View all staff members
4. Click status buttons: ✓ Present, ✕ Absent, ⊘ Half
5. Switch to monthly view to see summary
6. View statistics: Present, Absent, Half-day, Leave counts

### 4. Salary Management
1. Navigate to Accounts → Salary Management
2. Select month using month picker
3. Click "📊 Calculate Salaries" to auto-calculate for all staff
4. System calculates:
   - Basic salary from staff records
   - Allowances (10% of basic)
   - Deductions (5% of basic)
5. View calculated salaries in table
6. Click "Mark Paid" to record payment details
7. Select payment method and transaction ID
8. Salary status changes to "Paid"

---

## Performance Optimizations

1. **Collection Indexes**:
   - Create composite indexes for date + staffId in attendance
   - Create index for month in salaries collection
   - Index category in expenses for faster filtering

2. **Batch Operations**:
   - Salary calculation uses `Promise.all()` for concurrent updates
   - Monthly queries use date range filters to reduce data transfer

3. **Real-time Listeners**:
   - Each module uses `onSnapshot` for real-time updates
   - Unsubscribe on component unmount to prevent memory leaks
   - Filter data in memory for better performance

4. **State Management**:
   - Use `useMemo` for expensive calculations
   - Cache search/filter results to prevent re-renders

---

## Testing Checklist

- [ ] Payment History loads correctly
- [ ] Can search and filter payments
- [ ] Expense form validation works
- [ ] Expenses save to Firestore
- [ ] Attendance marking updates in real-time
- [ ] Salary calculation is accurate
- [ ] Status filters work correctly
- [ ] Responsive design on mobile
- [ ] Permission gates enforce access
- [ ] No errors in browser console

---

## Future Enhancements

1. **Salary Slips**:
   - Generate PDF salary slips with detailed breakdown
   - Email salary slips to staff

2. **Advanced Reporting**:
   - Charts and graphs for expense trends
   - Staff performance metrics based on attendance
   - Payroll analytics and comparisons

3. **Approvals Workflow**:
   - Add approval steps for expenses and salaries
   - Notification system for pending approvals

4. **Leave Management**:
   - Track leave balance per staff
   - Leave request approval workflow
   - Auto-deduct salary for approved leaves

5. **Exports**:
   - Export to Excel/CSV for external accounting software
   - PDF reports with company letterhead

6. **Integrations**:
   - Bank API integration for payment reconciliation
   - Email notifications for pending payments

---

## Troubleshooting

### Expenses not showing
- Check Firestore `expenses` collection exists
- Verify user has `accounts` module permissions
- Check browser console for query errors

### Attendance not updating
- Ensure `staff` collection has all employees
- Check `attendance` collection exists
- Verify staff IDs match between collections

### Salary calculation shows 0
- Verify staff have `basicSalary` field populated
- Check attendance records exist for selected month
- Ensure date format matches in queries

### Export button not working
- Feature is placeholder, use browser's print-to-PDF for now
- Will be implemented in future version

---

## Support

For questions or issues with the Accounts Management Module:
1. Check this documentation
2. Review Firestore rules configuration
3. Verify database schema matches
4. Check browser console for error messages
5. Review permission gates and user roles


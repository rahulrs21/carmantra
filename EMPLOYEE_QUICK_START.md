# Employee Module - Quick Start Guide

## 📍 Accessing the Employee Module

### Main Menu Navigation:
- **Admin Dashboard** → Look for "Employees" in the sidebar
- Or navigate directly to `/admin/employees`

---

## 🚀 Quick Start - 5 Minute Setup

### Step 1: Add First Employee
```
1. Click: /admin/employees → "Add Employee" button
2. Fill:
   - Name: John Doe
   - Email: john@example.com
   - Phone: +91-9876543210
   - Department: Sales
   - Position: Sales Executive
   - Joining Date: 2026-01-01
   - Salary: 50000
3. Click: "Add Employee"
```

### Step 2: Configure Settings
```
1. Go: /admin/employees/settings
2. Add Holidays:
   - Name: Independence Day
   - Date: August 15
3. Set Work Days: Mon-Fri
4. Set Leave Balance:
   - Casual: 12 days
   - Sick: 5 days
   - Earned: 18 days
```

### Step 3: Mark First Attendance
```
1. Go: /admin/employees/attendance
2. Select: Employee name
3. Click: Any date in calendar
4. Cycle through: Present (✓) → Absent (✗) → Leave (🔴) → Holiday (🔵)
```

---

## 📊 Module Access URLs

| Module | URL | Access Level |
|--------|-----|--------------|
| Employees | `/admin/employees` | Admin, Manager |
| Attendance | `/admin/employees/attendance` | Admin, Manager |
| Leaves | `/admin/employees/leaves` | All roles |
| Salary | `/admin/employees/salary` | Admin, Manager |
| Settings | `/admin/employees/settings` | Admin, Manager |

---

## 🎯 Common Workflows

### Workflow 1: Employee Onboarding
```
1. Create Employee Profile
   → /admin/employees → Add Employee

2. Create User Account (Optional)
   → /admin/users → Create user with same email
   
3. Set Leave Balance
   → /admin/employees/settings → Configure defaults

4. Start Attendance Tracking
   → /admin/employees/attendance → Begin marking attendance
```

### Workflow 2: Leave Approval
```
1. Employee submits leave request
   → /admin/employees/leaves → "Request Leave"

2. Manager/Admin reviews
   → /admin/employees/leaves → View pending requests

3. Approve or Reject
   → /admin/employees/leaves → Click "Approve" or "Reject"

4. View in Attendance
   → /admin/employees/attendance → Shows as "Leave" status
```

### Workflow 3: Monthly Salary Processing
```
1. Create Salary Records
   → /admin/employees/salary → "Add Salary"
   
2. Enter components
   → Base + Allowances - Deductions = Net Salary

3. Approve salary
   → Status changes to "Approved"

4. Mark as Paid
   → Status changes to "Paid"
   → View receipt/slip as PDF
```

---

## 💡 Tips & Tricks

### Attendance Calendar:
- Click any date to cycle through statuses
- Green = Present, Red = Absent, Yellow = Leave, Blue = Holiday
- View statistics at the top (Present/Absent/Total)

### Leave Management:
- Employees (Viewer role) can submit own leave requests
- Admins/Managers see all requests across company
- Can add rejection reasons for better communication

### Salary Slips:
- Automatically calculates net salary
- Shows detailed breakdown
- Can approve before finalizing
- Download as PDF for record keeping

### Settings:
- Set holidays once per year
- Configure work days for your organization
- Set default leave balance for new employees

---

## 📱 Mobile Usage

All features are fully mobile-responsive:
- Tables collapse into cards
- Calendar adapts to screen size
- Touch-friendly buttons
- Optimized dialogs
- Smooth scrolling

---

## ⚙️ Admin Features

### Permissions Management:
- Edit user roles to control who sees what
- Admin: Full access to all modules
- Manager: Same as admin
- Support: View leaves only
- Viewer: Can submit own leaves

### Reports & Analytics:
- Dashboard shows employee count
- See pending leaves at a glance
- Filter salaries by month/employee
- Track attendance patterns

### Bulk Operations:
- Mark attendance for multiple days
- Batch create employees
- Filter and sort all lists

---

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't add employee | Check if you have Admin/Manager role |
| Attendance not saving | Refresh page, check Firestore |
| Leave request not visible | Check filter (All/Pending/Approved) |
| Salary calculation wrong | Verify all fields are filled |
| Settings not saving | Ensure Admin/Manager role |

---

## 📞 Support Contacts

For help:
1. Check this guide first
2. Review module documentation
3. Contact system administrator
4. Check browser console for errors (F12)

---

## 🎓 Training Tips

For new users:
1. Start with Employee Management
2. Then Attendance Marking
3. Then Leave Requests
4. Finally Salary Management
5. Explore Settings for customization

---

## ✅ Checklist for First Use

- [ ] Access /admin/employees
- [ ] Add test employee
- [ ] Create user account for employee (optional)
- [ ] Go to /admin/employees/settings
- [ ] Add company holidays
- [ ] Set work days
- [ ] Configure leave balance
- [ ] Mark test attendance
- [ ] Create test salary record
- [ ] Test leave request (if employee user)

---

## 🔐 Security Notes

- Only authorized users can manage employees
- All actions are logged via Firestore
- Users can only see their own data (if employee)
- Admins can see all data
- Permission-based filtering applied automatically

---

## 📚 Keyboard Shortcuts

- `Ctrl/Cmd + N` - New item (in some modules)
- `Esc` - Close dialogs
- `Tab` - Navigate forms
- `Enter` - Submit forms

---

## 🌟 Best Practices

1. **Attendance:**
   - Mark attendance daily
   - Review at month-end
   - Handle holidays correctly

2. **Leave Management:**
   - Review requests promptly
   - Provide feedback to employees
   - Track leave balance

3. **Salary:**
   - Process monthly
   - Maintain records
   - Verify calculations

4. **Settings:**
   - Update holidays yearly
   - Review leave balance annually
   - Keep work days updated

---

*This is a quick reference guide. For detailed information, see EMPLOYEE_MODULE_IMPLEMENTATION.md*

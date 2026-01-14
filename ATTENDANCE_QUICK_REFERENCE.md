# ⚡ Attendance System - Quick Start & Troubleshooting Guide

## 🚀 Quick Start

### For Admin/Managers: Mark Daily Attendance
1. Navigate to `/admin/employees/attendance`
2. Select date from date picker
3. Choose department filter (optional)
4. Mark each employee: Present/Absent/Leave
5. Click "Save All" to persist

### For HR/Accounts: View Monthly Reports
1. Navigate to `/admin/employees/attendance/monthly`
2. Select month/year
3. Toggle between "List View" and "Charts View"
4. Filter by department
5. Export or print

---

## 📊 Understanding Salary Calculations

### Basic Formula
```
Net Salary = Gross Salary - (Deductions)

Where:
Deductions = (Absent Days + Unpaid Leave Days) × Per Day Salary
Per Day Salary = Gross Salary / Working Days in Month
```

### Example Calculation
```
Employee: Ahmad Hassan
Gross Salary: AED 5,000
Working Days in Month: 22

Step 1: Calculate Per Day Salary
Per Day = 5,000 / 22 = AED 227.27

Step 2: Count Payable Days
- Present: 18 days
- Paid Leave: 2 days
- Absent: 1 day
- Unpaid Leave: 1 day
Payable Days = 18 + 2 = 20 days

Step 3: Calculate Deductions
Deduction Days = 1 + 1 = 2 days
Deductions = 2 × 227.27 = AED 454.54

Step 4: Calculate Final Salary
Net Salary = 5,000 - 454.54 = AED 4,545.46

Breakdown:
- Gross: AED 5,000.00
- Deductions: AED 454.54
  - 1 Absent Day: AED 227.27
  - 1 Unpaid Leave: AED 227.27
- Net: AED 4,545.46
```

---

## 🎯 Key Concepts

### Attendance Status Options

| Status | Days Counted? | Affects Salary? | Requires Reason? |
|--------|---|---|---|
| **Present - Full** | 1.0 days | ❌ (Paid) | ❌ |
| **Present - Half** | 0.5 days | ❌ (Paid) | ❌ |
| **Present - Quarter** | 0.25 days | ❌ (Paid) | ❌ |
| **Paid Leave** | 1.0 days | ❌ (Paid) | ✅ (Optional) |
| **Unpaid Leave** | 0 days | ✅ (Deducted) | ✅ (Optional) |
| **Absent** | 0 days | ✅ (Deducted) | ✅ (Required) |
| **Not Marked** | Not counted | ❌ | - |

### Color Indicators
- 🟢 **Green** = Present
- 🔴 **Red** = Absent
- 🟡 **Yellow** = Leave
- ⚪ **Gray** = Not Marked

---

## 🔧 Common Tasks

### Task 1: Mark All Sales Team as Present
1. Go to `/admin/employees/attendance`
2. Department Filter: "Sales"
3. Check all visible employees
4. Click "Bulk Mark"
5. Select "Present" → "Full Day"
6. Confirm
7. Click "Save All"

### Task 2: Mark Employee on Paid Leave
1. Find employee in table
2. Status: "Leave"
3. Day Type: Automatically set to 1.0
4. Leave Reason: "Annual Leave"
5. Save

### Task 3: Mark Employee Absent with Reason
1. Find employee in table
2. Status: "Absent"
3. Absence Reason: "Sick Leave"
4. Optional Note: "Medical appointment"
5. Save

### Task 4: View Monthly Salary Report
1. Go to `/admin/employees/attendance/monthly`
2. Select desired month
3. View employee cards with:
   - Attendance percentage
   - Present/Absent/Leave days
   - Gross/Deductions/Net salary
4. Toggle "Charts View" for analytics

### Task 5: Export Monthly Report
1. Go to `/admin/employees/attendance/monthly`
2. Click "Export" button
3. Select format (PDF/Excel)
4. Choose employees to include
5. Download

---

## ❓ Troubleshooting

### Issue: "Save All" button is disabled
**Cause:** No attendance changes made to save
**Solution:** Mark or update at least one employee status

### Issue: Salary calculations showing as 0
**Cause:** Employee doesn't have salary configured
**Solution:** Go to employee profile and add salary amount

### Issue: Monthly summary not updating
**Cause:** Daily records not saved
**Solution:** Ensure daily attendance is saved before viewing monthly report

### Issue: Deductions seem incorrect
**Cause:** Weekend/holiday dates not configured
**Solution:** Check attendance settings for correct working days

### Issue: Bulk mark not working
**Cause:** No employees selected
**Solution:** Check employee names in left column of table

### Issue: Can't see other department employees
**Cause:** Department filter is set
**Solution:** Change filter from specific department to "All Departments"

### Issue: Date navigation not working
**Cause:** Date in future
**Solution:** Can only mark attendance for past or current dates

---

## 📱 Mobile Usage Tips

1. **Use Portrait Mode** for better table view
2. **Swipe Left/Right** to navigate dates
3. **Tap Status** dropdowns to mark quickly
4. **Use Bulk Mark** for multiple employees
5. **Landscape Mode** for viewing full monthly report

---

## 🔐 Permission Reference

### Who Can Do What?

**Admin:**
- ✅ Mark attendance for all employees
- ✅ View all attendance & salary data
- ✅ Approve salary calculations
- ✅ Manage holidays & settings
- ✅ Delete/modify records

**Manager:**
- ✅ Mark attendance for their team
- ✅ View team attendance & reports
- ❌ Cannot view salary details
- ❌ Cannot modify salary data

**HR:**
- ❌ Cannot mark attendance
- ✅ View attendance records
- ❌ Cannot view salary details
- ❌ Cannot modify data

**Accounts:**
- ❌ Cannot mark attendance
- ✅ View all attendance & salary
- ✅ Approve salary calculations
- ❌ Cannot mark attendance

**Employee:**
- ❌ Cannot mark attendance
- ✅ View own attendance records
- ✅ View own salary
- ❌ Cannot view other employees

---

## 📈 Analytics & Reporting

### Department Attendance Chart
- Shows attendance breakdown by department
- Compares Present/Absent/Leave counts
- Helps identify departments with attendance issues

### Employee Attendance Rate
- Calculates: (Present Days / Working Days) × 100
- Used for performance evaluation
- Affects salary deductions for absences

### Salary Breakdown View
- Displays detailed salary components
- Shows gross, deductions, and net
- Helps employees understand salary calculations

---

## 💡 Best Practices

1. **Mark Daily** - Mark attendance same day for accuracy
2. **Use Bulk Feature** - Efficiently mark large groups
3. **Add Reasons** - Always provide reason for absences
4. **Review Monthly** - Check monthly reports for accuracy
5. **Backup Data** - Regularly export attendance records
6. **Communicate Changes** - Inform HR of policy changes
7. **Keep Holidays Updated** - Maintain accurate holiday calendar

---

## 🎓 Training Checklist

For new admins/managers:
- [ ] Understand attendance status options
- [ ] Know how to mark daily attendance
- [ ] Familiar with bulk marking feature
- [ ] Can navigate monthly reports
- [ ] Understand salary calculation logic
- [ ] Know permission levels
- [ ] Can troubleshoot common issues

---

## 📞 Support Resources

- **Complete Guide:** `ATTENDANCE_SYSTEM_COMPLETE_GUIDE.md`
- **Type Definitions:** `lib/attendanceTypes.ts`
- **Calculations:** `lib/attendanceCalculations.ts`
- **Daily Marking Page:** `app/admin/employees/attendance/page.tsx`
- **Monthly Reports:** `app/admin/employees/attendance/monthly/page.tsx`

---

## 🎯 Next Steps

1. **Setup Firestore Collections** - Create necessary collections
2. **Configure Holidays** - Add company holidays to settings
3. **Train Users** - Educate admins/managers on system
4. **Mark Sample Data** - Test with sample employees
5. **Generate Reports** - Verify salary calculations
6. **Go Live** - Deploy to production

---

**Last Updated:** January 2026
**Status:** Ready for Production ✅

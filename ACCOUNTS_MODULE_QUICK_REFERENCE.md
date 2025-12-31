# Accounts Module - Quick Reference

## Module Files Created

```
✅ /app/admin/accounts/page.tsx              - Main Dashboard
✅ /app/admin/accounts/payments/page.tsx     - Payment History
✅ /app/admin/accounts/expenses/page.tsx     - Expense Management
✅ /app/admin/accounts/attendance/page.tsx   - Staff Attendance
✅ /app/admin/accounts/salary/page.tsx       - Salary Management
✅ ACCOUNTS_MODULE_IMPLEMENTATION.md         - Full Documentation
✅ ACCOUNTS_MODULE_FIRESTORE_SETUP.md        - Database Setup Guide
```

## Access Points

| Module | URL | Icon | Color |
|--------|-----|------|-------|
| Dashboard | `/admin/accounts` | 📊 | - |
| Payment History | `/admin/accounts/payments` | 💳 | Blue |
| Expense Management | `/admin/accounts/expenses` | 💰 | Green |
| Staff Attendance | `/admin/accounts/attendance` | 📋 | Purple |
| Salary Management | `/admin/accounts/salary` | 💵 | Orange |

## Key Features at a Glance

### 💳 Payment History
- View paid, partial, unpaid invoices
- Search by invoice #, customer, vehicle
- Filter by status, payment method
- Direct link to full invoice

### 💰 Expense Management
- Quick expense form (Category, Amount, Date, Vendor)
- 10 expense categories
- Monthly & all-time totals
- Search & filter by category
- Delete with confirmation

### 📋 Staff Attendance
- Date-based marking
- Status: Present, Absent, Half-day, Leave
- Real-time stats (Present, Absent, Not Marked)
- Monthly summary view
- Working hours tracking

### 💵 Salary Management
- Auto-calculate salaries from staff basic salary
- Include allowances (10%) & deductions (5%)
- Mark as paid with transaction details
- Monthly stats & averages
- Status tracking: Draft → Calculated → Approved → Paid

## Database Collections

### New Collections Created

#### `expenses`
```javascript
{
  category, description, amount, date, vendor, createdAt
}
```

#### `attendance`
```javascript
{
  staffId, staffName, date, checkIn, checkOut, status, workingHours, updatedAt
}
```
ID Format: `{staffId}_{YYYY-MM-DD}`

#### `salaries`
```javascript
{
  staffId, staffName, month, basicSalary, allowances, deductions, 
  netSalary, workingDays, status, createdAt, paidDate
}
```
ID Format: `{staffId}_{YYYY-MM}`

## Setup Steps (Quick)

1. **Create Collections** in Firestore
   - `expenses`
   - `attendance`
   - `salaries`

2. **Update Staff** - Add `basicSalary` field to existing staff documents

3. **Create Indexes** in Firestore (6 recommended indexes listed in setup guide)

4. **Deploy Security Rules** from ACCOUNTS_MODULE_FIRESTORE_SETUP.md

5. **Test Each Module**
   - Add test expense
   - Mark attendance
   - Calculate salary
   - View payment history

## State Management Pattern

All modules use React hooks with real-time Firestore listeners:

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(collection(db, 'collection_name')),
    (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setState(data);
    }
  );
  return () => unsubscribe();
}, []);
```

## Form Submission Pattern

All forms use `addDoc` or `setDoc` with Firestore:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await addDoc(collection(db, 'collection'), {
      ...formData,
      createdAt: Timestamp.now()
    });
    setFormData(initialState);
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to save');
  }
};
```

## Firestore Query Patterns

### Range Query (Date-based)
```typescript
const q = query(
  collection(db, 'expenses'),
  where('date', '>=', Timestamp.fromDate(startDate)),
  where('date', '<=', Timestamp.fromDate(endDate))
);
```

### Multi-value Filter
```typescript
const q = query(
  collection(db, 'invoices'),
  where('paymentStatus', 'in', ['paid', 'partial'])
);
```

### Real-time Listener with Sorting
```typescript
const q = query(
  collection(db, 'attendance'),
  orderBy('date', 'desc')
);
const unsubscribe = onSnapshot(q, (snapshot) => {
  // Handle data
});
```

## Permission Gates

All modules use PermissionGate wrapper:

```typescript
<ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
  {/* Module content */}
</ModuleAccessComponent>
```

Actions: `view`, `create`, `update`, `delete`, `export`

## UI Component Library

All modules use existing components:
- `Button` - from `/components/ui/button`
- `Input` - from `/components/ui/input`
- `PermissionGate` - from `/components/PermissionGate`

No additional UI library imports needed!

## Responsive Design

All tables use this pattern for mobile:
- Desktop: Full HTML table
- Mobile: Card-based layout (CSS display changes)

```typescript
// Desktop (screens >= md)
<div className="hidden md:block">
  <table>...</table>
</div>

// Mobile (screens < md)
<div className="md:hidden">
  <div>...</div>
</div>
```

## Real-time Updates

All data updates instantly:
- Add expense → appears in list
- Mark attendance → stats update
- Calculate salary → table populates
- Mark paid → status changes

No manual refresh needed!

## Export Features (Future)

Placeholder buttons for:
- Payment report PDF
- Expense summary Excel
- Attendance records CSV
- Salary slips PDF

## Calculation Formulas

### Net Salary
```
Net Salary = Basic Salary + Allowances (10%) - Deductions (5%)
```

### Monthly Profit
```
Monthly Profit = Total Income (paid invoices) - Total Expenses
```

### Working Hours
```
Working Hours = Present Days + (Half Days × 0.5)
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Collections not found | Verify exact spelling in Firestore |
| Data not loading | Check Firestore rules permissions |
| Timestamp errors | Ensure date fields use Timestamp type |
| Search not working | Check searchable field names match |
| Staff not showing | Verify staff collection has name field |
| Salary shows 0 | Check staff have basicSalary > 0 |

## File Locations Quick Links

**Main Files**:
- Dashboard: `app/admin/accounts/page.tsx` (180 lines)
- Payments: `app/admin/accounts/payments/page.tsx` (220 lines)
- Expenses: `app/admin/accounts/expenses/page.tsx` (240 lines)
- Attendance: `app/admin/accounts/attendance/page.tsx` (260 lines)
- Salary: `app/admin/accounts/salary/page.tsx` (280 lines)

**Documentation**:
- Full Guide: `ACCOUNTS_MODULE_IMPLEMENTATION.md`
- Setup Guide: `ACCOUNTS_MODULE_FIRESTORE_SETUP.md`
- Quick Ref: `ACCOUNTS_MODULE_QUICK_REFERENCE.md` (this file)

## Next Steps

1. ✅ Review implementation files
2. ⏳ Create Firestore collections
3. ⏳ Deploy security rules
4. ⏳ Test all modules
5. ⏳ Add sample data
6. ⏳ Train users
7. ⏳ Monitor usage & performance
8. ⏳ Implement future enhancements

## Support Resources

- **Firestore Docs**: https://firebase.google.com/docs/firestore
- **Next.js Docs**: https://nextjs.org/docs
- **React Hooks**: https://react.dev/reference/react
- **Tailwind CSS**: https://tailwindcss.com/docs

## Testing Checklist

- [ ] Can navigate to all 4 modules from dashboard
- [ ] Payment history shows invoices
- [ ] Can add new expense
- [ ] Can mark staff attendance
- [ ] Salary calculation works
- [ ] All filters work correctly
- [ ] Search functionality works
- [ ] Mobile responsive layout displays correctly
- [ ] Real-time updates work
- [ ] Permission gates enforced
- [ ] No console errors
- [ ] Data persists after refresh

## Performance Notes

- Real-time listeners may show brief loading state
- Large datasets (1000+ records) may need pagination
- Firestore queries are optimized with indexes
- Consider adding pagination for future scalability

## Security Considerations

- All collections protected by Firestore rules
- User authentication required
- Role-based access control enforced
- Salary data is private (only visible to user & HR)
- Admin has full access to all data


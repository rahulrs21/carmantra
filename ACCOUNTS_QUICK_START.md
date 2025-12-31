# Accounts Date Filter - Quick Start Guide

## What Was Just Created?

A **shared date range filter** for the Accounts module that lets users select a date range in the dashboard, and all sub-pages automatically filter their data to match.

## How to Use It

### For Users:

1. Go to **Accounts Dashboard** (`/admin/accounts`)
2. Click one of the date filter buttons:
   - **Last 30d** - Shows data from the last 30 days
   - **Yesterday** - Shows only yesterday's data
   - **Today** - Shows only today's data
   - **Custom** - Pick your own date range with calendar

3. The dashboard stats update instantly
4. All sub-pages (Payments, Expenses, etc.) automatically use the same filter
5. Navigate to any sub-page and data is filtered for the selected date range

### For Developers:

## To implement in a new/existing child page:

### Quick 3-Step Integration:

**Step 1: Add imports**
```tsx
import { useAccounts } from '@/lib/accountsContext';
import { filterByDateRange } from '@/lib/accountsUtils';
```

**Step 2: Use the hook**
```tsx
const { activeRange, rangeLabel } = useAccounts();
```

**Step 3: Filter your data**
```tsx
const filteredData = useMemo(() => {
  if (!activeRange) return [];
  return filterByDateRange(data, 'dateFieldName', activeRange.start, activeRange.end);
}, [data, activeRange]);
```

That's it! Your page is now connected to the shared date filter.

## Working Examples

- ✅ **Payments Page**: `/app/admin/accounts/payments/page.tsx` - COMPLETE
  - Shows how to integrate the date filter
  - Shows how to display rangeLabel
  - Shows how to use filterByDateRange()

## Ready to Implement

- ⏳ **Expenses Page**: `/app/admin/accounts/expenses/page.tsx`
- ⏳ **Attendance Page**: `/app/admin/accounts/attendance/page.tsx`
- ⏳ **Salary Page**: `/app/admin/accounts/salary/page.tsx`

## Files Reference

| File | Purpose |
|------|---------|
| `lib/accountsContext.tsx` | React Context that manages the date state |
| `lib/accountsUtils.ts` | Helper functions for filtering and formatting |
| `app/admin/accounts/layout.tsx` | Wraps the accounts module with the provider |
| `app/admin/accounts/page.tsx` | Dashboard with date filter UI |
| `app/admin/accounts/payments/page.tsx` | Example implementation ✅ |

## Documentation Files

| File | Purpose |
|------|---------|
| `ACCOUNTS_DATE_FILTER_IMPLEMENTATION.md` | Detailed explanation of how it works |
| `ACCOUNTS_IMPLEMENTATION_CHECKLIST.md` | Step-by-step checklist for remaining pages |
| `ACCOUNTS_ARCHITECTURE_DIAGRAM.md` | Visual architecture and data flow |
| `lib/ACCOUNTS_DATE_FILTER_TEMPLATE.md` | Reusable template for new pages |

## How It Works (Simple Version)

```
1. User picks a date in the Dashboard
   ↓
2. Context state updates
   ↓
3. All pages that use useAccounts() get the new date
   ↓
4. Pages filter their data automatically
   ↓
5. Everything displays filtered results
```

## Common Date Fields to Use

When calling `filterByDateRange()`, use the correct date field name:

| Page | Field Name |
|------|------------|
| Payments | `'paymentDate'` or `'updatedAt'` |
| Expenses | `'date'` or `'createdAt'` |
| Attendance | `'attendanceDate'` or `'date'` |
| Salary | `'paymentDate'` or `'salaryDate'` |

Check your Firestore schema if unsure.

## Testing

Quick test procedure:

1. Open Accounts Dashboard
2. Change the date filter (e.g., click "Today")
3. Open a child page (e.g., Payments)
4. Verify data matches the selected date
5. Go back to dashboard
6. Change date filter again (e.g., "Last 30d")
7. Child page should auto-update with new data

## Troubleshooting

**Issue**: Child page shows all data, ignoring the filter
- **Solution**: Make sure you're using `filterByDateRange()` and including `activeRange` in useMemo dependencies

**Issue**: Date field is wrong
- **Solution**: Check your Firestore document schema to find the correct field name
- Use `console.log()` to inspect the data

**Issue**: "useAccounts must be used within an AccountsProvider"
- **Solution**: Make sure the page is inside `/admin/accounts/` (it already is)
- The layout.tsx wrapper will handle the provider

## Need More Help?

1. Check `ACCOUNTS_DATE_FILTER_IMPLEMENTATION.md` for detailed docs
2. Look at `/app/admin/accounts/payments/page.tsx` for a working example
3. See `ACCOUNTS_IMPLEMENTATION_CHECKLIST.md` for step-by-step instructions
4. Review `lib/ACCOUNTS_DATE_FILTER_TEMPLATE.md` for the template

## Summary

✅ **What's Set Up:**
- Shared date context for the entire Accounts module
- Date filter UI in the dashboard
- Working example in Payments page
- Utility functions for easy integration
- Complete documentation

✅ **What You Need to Do:**
- Add 3 lines of code to each child page (import, hook, useMemo)
- Test with different date ranges
- Done!

The system is designed to be **simple** and **automatic** - once a page uses the context, it just works.

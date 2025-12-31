# Quick Implementation Checklist for Remaining Accounts Pages

Use this checklist to quickly add date filtering to the remaining child pages.

## For: `app/admin/accounts/expenses/page.tsx`

- [ ] Add to imports:
  ```tsx
  import { useAccounts } from '@/lib/accountsContext';
  import { filterByDateRange } from '@/lib/accountsUtils';
  ```

- [ ] Add hook call in component:
  ```tsx
  const { activeRange, rangeLabel } = useAccounts();
  ```

- [ ] Add to dependencies when fetching data:
  ```tsx
  useEffect(() => {
    // ... fetch code
  }, [activeRange]);
  ```

- [ ] Create filtered memo for expenses:
  ```tsx
  const filteredExpenses = useMemo(() => {
    if (!activeRange) return [];
    return filterByDateRange(expenses, 'date', activeRange.start, activeRange.end);
  }, [expenses, activeRange]);
  ```

- [ ] Update header to show range:
  ```tsx
  <p className="text-xs text-gray-400 mt-1">
    Viewing: <span className="font-medium text-gray-600">{rangeLabel}</span>
  </p>
  ```

- [ ] Use `filteredExpenses` instead of `expenses` in the table/display

- [ ] Test: Change date in parent → verify expenses filter updates

---

## For: `app/admin/accounts/attendance/page.tsx`

Same steps as expenses, but:
- Use `'attendanceDate'` or `'date'` as the dateField (check your schema)
- Create `filteredAttendance` instead of `filteredExpenses`
- Update the dependency array with `[attendance, activeRange]`

---

## For: `app/admin/accounts/salary/page.tsx`

Same steps as expenses, but:
- Use `'salaryDate'` or `'paymentDate'` as the dateField (check your schema)
- Create `filteredSalary` instead of `filteredExpenses`
- Update the dependency array with `[salary, activeRange]`

---

## Common Mistakes to Avoid

❌ **Don't:**
- Forget to include `activeRange` in useMemo dependencies
- Use wrong date field name (check your Firestore schema)
- Forget to update header to show rangeLabel

✅ **Do:**
- Test with different date ranges from parent
- Check console for errors
- Verify the date field exists in your data
- Use the utility function instead of manual filtering

---

## Testing Each Page

1. Navigate to `/admin/accounts` (parent dashboard)
2. Change date range (e.g., "Today", "Last 30d", custom range)
3. Navigate to child page (e.g., `/admin/accounts/expenses`)
4. Verify data updates to match the selected range
5. Go back to parent and change range again
6. Child page should auto-update when you return
7. Verify counts/totals are correct for the date range

---

## Need Help?

Refer to:
- `lib/accountsContext.tsx` - Context implementation
- `lib/accountsUtils.ts` - Utility functions
- `app/admin/accounts/payments/page.tsx` - Working example
- `lib/ACCOUNTS_DATE_FILTER_TEMPLATE.md` - Detailed template

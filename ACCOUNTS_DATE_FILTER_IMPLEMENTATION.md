# Accounts Module Date Filter Implementation

## Overview
A shared date range filter has been added to the Accounts module that allows users to select a date range in the dashboard, which automatically reflects in all child pages (Payments, Expenses, Attendance, Salary).

## Files Created/Modified

### New Files Created:
1. **`lib/accountsContext.tsx`** - React Context for managing date range state
2. **`lib/accountsUtils.ts`** - Utility functions for date filtering and formatting
3. **`app/admin/accounts/layout.tsx`** - Layout wrapper with AccountsProvider
4. **`lib/ACCOUNTS_DATE_FILTER_TEMPLATE.md`** - Template for implementing in child pages

### Modified Files:
1. **`app/admin/accounts/page.tsx`** - Added date filter UI and integrated context
2. **`app/admin/accounts/payments/page.tsx`** - Integrated date filtering (example implementation)

## Features

### Date Range Options
- **Last 30 days** - Default option, shows data from last 30 days
- **Yesterday** - Single day filter
- **Today** - Current day only
- **Custom** - Pick your own date range with calendar picker

### How It Works

1. **Parent Component (Accounts Dashboard)**
   - Displays date filter controls
   - Provides selectedRange through Context
   - All stats update based on selected range

2. **Child Components (Payments, Expenses, etc.)**
   - Access the shared date range via `useAccounts()` hook
   - Filter their data automatically when date changes
   - Display current range label in their headers

## Usage Example for Child Pages

### Step 1: Import the hook and utilities
```tsx
import { useAccounts } from '@/lib/accountsContext';
import { filterByDateRange } from '@/lib/accountsUtils';
```

### Step 2: Use the hook in your component
```tsx
const { activeRange, rangeLabel } = useAccounts();
```

### Step 3: Filter your data
```tsx
const filteredData = useMemo(() => {
  if (!activeRange) return [];
  return filterByDateRange(
    data, 
    'dateFieldName',  // e.g., 'createdAt', 'date', 'paymentDate'
    activeRange.start, 
    activeRange.end
  );
}, [data, activeRange]);
```

### Step 4: Display the range
```tsx
<p>Viewing: <span className="font-medium">{rangeLabel}</span></p>
```

## Context API Reference

### `useAccounts()` Hook Returns:

```typescript
{
  rangeType: 'last30d' | 'yesterday' | 'today' | 'custom',
  setRangeType: (type) => void,
  customRange: { from: Date | null, to: Date | null },
  setCustomRange: (range) => void,
  selectedRange: any,
  setSelectedRange: (range) => void,
  isPopoverOpen: boolean,
  setIsPopoverOpen: (open) => void,
  activeRange: {
    start: Date,
    end: Date,
    isDaily: boolean
  } | null,
  rangeLabel: string // e.g., "Last 30 days", "12/01/2024 — 15/01/2024"
}
```

## Utility Functions

### `filterByDateRange(items, dateField, start, end)`
Filters an array of objects by a date field within a range.
- **items**: Array to filter
- **dateField**: String name of the date field
- **start**: Start date
- **end**: End date
- **Returns**: Filtered array

### `toDate(timestamp)`
Converts various date formats to a JavaScript Date object.
- Handles Firestore Timestamps
- Handles seconds-based timestamps
- Handles JavaScript Date objects

### `formatDateOnly(date)`
Formats a date as DD/MM/YYYY.

### `formatDateTime12(timestamp)`
Formats a timestamp as DD/MM/YYYY HH:MM AM/PM.

## Implementation Status

✅ **Completed:**
- Context provider setup
- Date filter UI in dashboard
- Integration in Payments page
- Utility functions created
- Layout wrapper created

⏳ **Needs Implementation:**
- `app/admin/accounts/expenses/page.tsx` - Add date filtering
- `app/admin/accounts/attendance/page.tsx` - Add date filtering
- `app/admin/accounts/salary/page.tsx` - Add date filtering

## How to Apply to Remaining Pages

For each remaining child page (expenses, attendance, salary):

1. Add imports:
```tsx
import { useAccounts } from '@/lib/accountsContext';
import { filterByDateRange } from '@/lib/accountsUtils';
```

2. Add hook call:
```tsx
const { activeRange, rangeLabel } = useAccounts();
```

3. Create filtered memo:
```tsx
const filteredData = useMemo(() => {
  if (!activeRange) return [];
  return filterByDateRange(data, 'yourDateField', activeRange.start, activeRange.end);
}, [data, activeRange]);
```

4. Use filteredData instead of raw data
5. Display rangeLabel in the header

See `lib/ACCOUNTS_DATE_FILTER_TEMPLATE.md` for detailed template.

## Testing

1. Open Accounts Dashboard (`/admin/accounts`)
2. Use the date filter controls to change the date range
3. Verify statistics update based on the selected range
4. Navigate to child pages (Payments, etc.)
5. Verify data is filtered for the selected date range
6. Go back to dashboard and change filter
7. Go to child page again and verify new filter is applied

## Notes

- The date filter automatically applies to all child pages that use the context
- No additional Firebase indexes are needed (filtering happens in code)
- The range label helps users understand what timeframe they're viewing
- Custom date range picker uses a calendar UI for easy selection

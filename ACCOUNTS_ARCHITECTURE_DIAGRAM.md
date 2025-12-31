# Accounts Date Filter Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      ACCOUNTS MODULE LAYOUT                      │
│              (app/admin/accounts/layout.tsx)                     │
│                   ↓ Wraps with Provider ↓                       │
│          <AccountsProvider> ... </AccountsProvider>             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────┴──────────────────────────────────┐
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │     ACCOUNTS DASHBOARD                                   │ │
│  │   (app/admin/accounts/page.tsx)                          │ │
│  │                                                           │ │
│  │  ✓ Date Filter UI (30d/Yesterday/Today/Custom)         │ │
│  │  ✓ useAccounts() Hook                                   │ │
│  │  ✓ Displays: totalIncome, totalExpenses, etc.          │ │
│  │  ✓ Updates when date changes                            │ │
│  │                                                           │ │
│  └───┬─────────────────────────────────────────────────────┘ │
│      │                                                         │
│      │  Context State Changes (activeRange, rangeLabel)     │
│      │                                                         │
├─────┴────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │  PAYMENTS PAGE   │  │  EXPENSES PAGE   │  │ OTHER ...  │ │
│  │  (Implemented)   │  │  (Ready)         │  │ (Ready)    │ │
│  │                  │  │                  │  │            │ │
│  │ useAccounts()    │  │ useAccounts()    │  │            │ │
│  │ activeRange ────→│  │ activeRange ────→│  │            │ │
│  │ filterByDate()   │  │ filterByDate()   │  │            │ │
│  │                  │  │                  │  │            │ │
│  │ Filtered List:   │  │ Filtered List:   │  │            │ │
│  │ - Payments       │  │ - Expenses       │  │            │ │
│  │ - By Date Range  │  │ - By Date Range  │  │            │ │
│  └──────────────────┘  └──────────────────┘  └────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Data Flow

```
USER INTERACTION
    ↓
┌─────────────────────────────────┐
│ Click "Last 30d" / "Custom"    │
│ (Accounts Dashboard)            │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ setRangeType() / setCustomRange() triggered        │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ AccountsContext updates:                            │
│ - rangeType                                         │
│ - customRange                                       │
│ - activeRange (calculated from above)              │
│ - rangeLabel (human-readable)                      │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ Dashboard page re-renders:                          │
│ - fetchDashboardData() runs with new activeRange   │
│ - Stats update                                      │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ All child pages re-render:                          │
│ - useAccounts() returns new activeRange            │
│ - useMemo recalculates filtered data               │
│ - UI updates with filtered results                 │
└─────────────────────────────────────────────────────┘
```

## File Structure

```
lib/
├── accountsContext.tsx          ← Provider & Hook
├── accountsUtils.ts             ← Helper functions
├── ACCOUNTS_DATE_FILTER_TEMPLATE.md

app/admin/accounts/
├── layout.tsx                   ← Wraps with Provider
├── page.tsx                     ← Dashboard with Date Filter UI
├── payments/
│   └── page.tsx                 ← IMPLEMENTED ✅
├── expenses/
│   └── page.tsx                 ← Ready to implement
├── attendance/
│   └── page.tsx                 ← Ready to implement
└── salary/
    └── page.tsx                 ← Ready to implement

Root/
├── ACCOUNTS_DATE_FILTER_IMPLEMENTATION.md
└── ACCOUNTS_IMPLEMENTATION_CHECKLIST.md
```

## Key Components

### 1. Context Provider (accountsContext.tsx)
- Manages: rangeType, customRange, selectedRange, isPopoverOpen
- Calculates: activeRange, rangeLabel
- Provides: useAccounts() hook

### 2. Layout Wrapper (layout.tsx)
```tsx
<AccountsProvider>
  {children}
</AccountsProvider>
```

### 3. Dashboard (page.tsx)
- Renders date filter buttons
- Uses useAccounts() to get/set values
- Fetches data based on activeRange

### 4. Child Pages
- Call useAccounts() to get activeRange
- Filter their data with filterByDateRange()
- Display rangeLabel for UX

## How It All Works Together

1. **User selects a date range** in the Accounts Dashboard
2. **Context state updates** with the new range
3. **Dashboard recalculates stats** using the new activeRange
4. **Child pages automatically receive new activeRange** via useAccounts()
5. **Child pages filter their data** and re-render
6. **Everything stays in sync** because all pages share the same context

## Benefits

✓ No prop drilling needed
✓ Changes reflect across all pages automatically
✓ Single source of truth for date range
✓ Easy to implement in new pages
✓ Clean, reusable code
✓ No Firebase index needed (filtering in code)

## State Management Visualization

```
┌────────────────────────────────────┐
│   AccountsContext                  │
│                                    │
│  rangeType: '30d'                  │
│    ↓                               │
│  customRange: { from, to }         │
│    ↓                               │
│  activeRange: {                    │
│    start: Date,                    │
│    end: Date,                      │
│    isDaily: boolean                │
│  }                                 │
│    ↓                               │
│  rangeLabel: "Last 30 days"        │
│                                    │
└────────────────────────────────────┘
         ↓ Provided to ↓
┌─────────────────────────────────────────┐
│  All Pages in /admin/accounts/*         │
│  Access via: useAccounts()              │
└─────────────────────────────────────────┘
```

## Implementation Status

```
✅ Context Created
✅ Layout Wrapper Created
✅ Dashboard Updated with UI
✅ Utilities Created
✅ Payments Page Implemented (Example)
⏳ Expenses Page (Ready to implement)
⏳ Attendance Page (Ready to implement)
⏳ Salary Page (Ready to implement)
```

## Next Steps

1. Open `ACCOUNTS_IMPLEMENTATION_CHECKLIST.md`
2. Follow the checklist for each remaining page
3. Test each page with different date ranges
4. Verify filtering works correctly

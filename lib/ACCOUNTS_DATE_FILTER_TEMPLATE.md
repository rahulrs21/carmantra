/**
 * TEMPLATE: How to use Date Filtering in Accounts Child Pages
 * 
 * This template shows how to integrate the shared date range filter
 * from the Accounts dashboard into child pages (expenses, attendance, salary, etc.)
 */

// 1. Import the accounts context and utilities
import { useAccounts } from '@/lib/accountsContext';
import { filterByDateRange, toDate, formatDateOnly } from '@/lib/accountsUtils';

// 2. Inside your component, use the hook
export default function AccountsChildPage() {
  const { activeRange, rangeLabel } = useAccounts();
  const [data, setData] = useState<any[]>([]);

  // 3. Fetch data (without date filtering in the query)
  useEffect(() => {
    const q = query(collection(db, 'your-collection'));
    const unsub = onSnapshot(q, (snapshot) => {
      const rawData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setData(rawData);
    });
    return () => unsub();
  }, []);

  // 4. Filter data by the selected date range
  const filteredData = useMemo(() => {
    if (!activeRange) return [];
    return filterByDateRange(data, 'dateField', activeRange.start, activeRange.end);
  }, [data, activeRange]);

  // 5. Display the range label
  return (
    <div>
      <h1>Child Page Title</h1>
      <p>Viewing: <span className="font-medium">{rangeLabel}</span></p>
      
      {/* Your component content with filteredData */}
    </div>
  );
}

/**
 * KEY POINTS:
 * 
 * 1. activeRange contains:
 *    - start: Date (start of selected range)
 *    - end: Date (end of selected range)
 *    - isDaily: boolean (whether it's a daily or range query)
 * 
 * 2. rangeLabel is a human-readable label like "Last 30 days", "Today", etc.
 * 
 * 3. filterByDateRange utility:
 *    - First param: array of items to filter
 *    - Second param: the field name containing the date (e.g., 'createdAt', 'date', 'paymentDate')
 *    - Third & Fourth: start and end dates from activeRange
 * 
 * 4. The date field should be one of these formats:
 *    - Firestore Timestamp with .toDate() method
 *    - Firestore Timestamp with .seconds property
 *    - JavaScript Date object
 * 
 * 5. When date changes in parent (Accounts dashboard):
 *    - activeRange updates automatically
 *    - filteredData recalculates in useMemo
 *    - Component re-renders with new filtered data
 * 
 * IMPLEMENTATION CHECKLIST:
 * [ ] Import useAccounts hook
 * [ ] Import filterByDateRange and utilities
 * [ ] Call useAccounts() in component
 * [ ] Add activeRange to useEffect or data fetching dependency
 * [ ] Create useMemo for filtered data using filterByDateRange
 * [ ] Display rangeLabel in UI to show current filter
 * [ ] Test with different date ranges from parent dashboard
 */

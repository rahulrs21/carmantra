# Service Pages Firestore Integration

## Overview
All 5 service category pages now fetch data dynamically from Firestore instead of using hardcoded data. This means any changes made in the `/admin/products/` module will immediately reflect on the service pages.

## Updated Service Pages
1. **PPF Wrapping** - `/app/services/ppf-wrapping/page.tsx`
2. **Car Wash** - `/app/services/car-wash/page.tsx`
3. **Ceramic Coating** - `/app/services/ceramic-coating/page.tsx`
4. **Car Polishing** - `/app/services/car-polishing/page.tsx`
5. **Car Tinting** - `/app/services/car-tinting/page.tsx`

## How It Works

### New Hook: `useServiceData`
Created a custom React hook at `/lib/hooks/useServiceData.ts` that:
- Fetches category data by slug from Firestore
- Fetches all products for that category
- Handles loading and error states
- Returns real-time data with products sorted by name

```typescript
const { category, products, loading, error } = useServiceData('car-wash');
```

### Data Flow
1. Service page loads with category slug (e.g., 'ppf-wrapping')
2. Hook queries Firestore for category matching that slug
3. Hook fetches all products for that category
4. Service page renders products dynamically with loading/error states

### Product Properties
Products now display the following Firestore fields:
- `name` - Product title (e.g., "Elite Wrap – Matte")
- `description` - Product details
- `price` - Service cost (stored as string, e.g., "7000")
- `warranty` - Warranty information (e.g., "10 Years Warranty")
- `duration` - Service duration (e.g., "2-3 days")

## Benefits
✅ Single source of truth - Products managed in admin panel  
✅ Real-time updates - Changes immediately visible on service pages  
✅ No hardcoded data - Eliminates duplication and maintenance burden  
✅ Dynamic product count - Automatically shows all migrated products  
✅ Loading states - Professional UX with spinners and error handling  

## Example: Updating Service Data
To change a product's price:

1. Go to `/admin/products/`
2. Select the category (e.g., "PPF Wrapping")
3. Edit the product price (e.g., "8000")
4. Save changes
5. **Service page automatically updates** - No deployment needed!

## Slug Mapping
The hook queries Firestore by category slug:
- PPF Wrapping page uses: `useServiceData('ppf-wrapping')`
- Car Wash page uses: `useServiceData('car-wash')`
- Ceramic Coating page uses: `useServiceData('ceramic-coating')`
- Car Polishing page uses: `useServiceData('car-polishing')`
- Car Tinting page uses: `useServiceData('car-tinting')`

These slugs must match exactly with the slugs created in the admin panel.

## Error Handling
Each service page shows:
- **Loading state** - Spinner while fetching data
- **Error state** - User-friendly error message if data fetch fails
- **Empty state** - Message if no products available

## Files Modified
1. `/lib/hooks/useServiceData.ts` - New hook (created)
2. `/app/services/ppf-wrapping/page.tsx` - Integrated hook
3. `/app/services/car-wash/page.tsx` - Integrated hook
4. `/app/services/ceramic-coating/page.tsx` - Integrated hook
5. `/app/services/car-polishing/page.tsx` - Integrated hook
6. `/app/services/car-tinting/page.tsx` - Integrated hook

## Next Steps (Optional)
- Update ModalForm component to also fetch products dynamically
- Add product image support in admin panel
- Add product analytics/tracking

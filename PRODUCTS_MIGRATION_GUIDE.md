# Products Migration Guide

## Overview

The Products Management system includes an automatic migration tool that populates your Firestore database with the existing service categories and their products based on your current service pages.

## Existing Categories

The following 5 categories with their complete product data are ready to be migrated:

### 1. **PPF Wrapping**
- Slug: `ppf-wrapping`
- 6 Products including Elite Wrap, Basic Wrap, Standard Color PPF variations

### 2. **Ceramic Coating**
- Slug: `ceramic-coating`
- 3 Products: Professional, Premium, and Touch-up services

### 3. **Car Tinting**
- Slug: `car-tinting`
- 3 Products: Standard, Premium Ceramic, and Full Package tinting

### 4. **Car Wash**
- Slug: `car-wash`
- 4 Products: Basic Wash, Premium Wash & Wax, Full Detailing, Engine Bay Cleaning

### 5. **Car Polishing**
- Slug: `car-polishing`
- 4 Products: Single Stage, Multi-Stage, Paint Correction, and Spot Polishing

## Total Data Being Migrated
- **Categories**: 5
- **Products**: 20 (with full pricing, warranty, duration information)

## How to Migrate

### Method 1: Using the Admin Dashboard (Recommended)

1. **Navigate to Products**: Go to `/admin/products`
2. **Look for Migration Banner**: You'll see a blue banner saying "Migrate Existing Categories"
3. **Click "Migrate Now"**: The system will:
   - Create all 5 categories in Firestore
   - Add all 20 products with their details
   - Display a success message
   - Reload the page to show the new categories

### Method 2: Using the API (Direct)

```bash
curl -X POST http://localhost:3000/api/admin/migrate-products \
  -H "Content-Type: application/json"
```

## What Gets Migrated

### For Each Category:
- ✅ Category Name (e.g., "PPF Wrapping")
- ✅ Category Slug (e.g., "ppf-wrapping") 
- ✅ Description
- ✅ Creation Timestamp

### For Each Product:
- ✅ Product Name
- ✅ Product Description
- ✅ Price (in AED)
- ✅ Warranty Period
- ✅ Duration
- ✅ Category Reference
- ✅ Creation Timestamp

## Example: PPF Wrapping Products

After migration, you'll have:

| Product Name | Price | Warranty | Duration |
|---|---|---|---|
| Elite Wrap – Matte | AED 7,000 | 10 Years | 2-3 days |
| Elite Wrap – Glossy | AED 6,000 | 10 Years | 2-3 days |
| Basic Wrap – Matte | AED 4,000 | 5 Years | 2-3 days |
| Basic Wrap – Glossy | AED 3,000 | 5 Years | 2-3 days |
| Standard Color PPF – Matte | AED 7,000 | 5 Years | 2-3 days |
| Standard Color PPF – Glossy | AED 6,000 | 5 Years | 2-3 days |

## Important Notes

### ⚠️ One-Time Operation
- **The migration is safe to run**: It extracts data from hardcoded service pages
- **Can be run multiple times**: If you accidentally run it twice, you'll get duplicate categories
- **To avoid duplicates**: Check if categories already exist before migrating

### 📝 Modification After Migration
After migration, you can:
- ✅ Edit existing products
- ✅ Add new products to categories
- ✅ Delete products
- ✅ Modify prices, warranties, durations
- ✅ Rearrange categories

### 🔄 Next Steps After Migration

1. **Update Service Pages** (Optional but Recommended):
   - Modify service pages to fetch products dynamically from Firestore
   - Replace hardcoded service arrays with API calls
   - This allows pricing changes to update automatically

2. **Update Forms**:
   - Update ModalForm to fetch services from Firestore
   - Ensures consistent product listings across the app

3. **Verify Data**:
   - Check each category to ensure all products migrated correctly
   - Update descriptions if needed
   - Adjust pricing if different from current rates

## Data Source

The migration data comes from:
- `/app/services/ppf-wrapping/page.tsx`
- `/app/services/ceramic-coating/page.tsx`
- `/app/services/car-tinting/page.tsx`
- `/app/services/car-wash/page.tsx`
- `/app/services/car-polishing/page.tsx`

## Migration Progress

**Status**: ✅ Ready to Migrate

When you click "Migrate Now":
1. System creates all 5 categories in Firestore
2. System adds all 20 products with their details
3. Success message displays
4. Categories appear on the dashboard

## Troubleshooting

**Issue**: "Categories already exist" warning
- **Solution**: This is normal if you already migrated. Proceed only if you want to create duplicates.

**Issue**: Migration fails with error
- **Solution**: Check browser console for detailed error message
- Ensure you have proper Firestore permissions
- Try refreshing and migrating again

**Issue**: Only some categories appear after migration
- **Solution**: Reload the page (F5)
- Check Firestore console to verify data was saved
- Try migrating again

## Confirmation of Success

After successful migration, you should see:
1. ✅ All 5 categories displayed on `/admin/products`
2. ✅ Each category shows its slug and description
3. ✅ "View Products" button opens products list for each category
4. ✅ Each category shows all its products with prices

## Files Modified/Created

- **Migration Logic**: `/lib/firestore/migrateExistingProducts.ts`
- **API Endpoint**: `/app/api/admin/migrate-products/route.ts`
- **Dashboard Updated**: `/app/admin/products/page.tsx`

---

**Need Help?** The migration is automated and safe to run. If you encounter issues, the error message will indicate what went wrong.

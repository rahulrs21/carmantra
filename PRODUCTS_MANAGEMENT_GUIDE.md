# Products Management Module - Quick Start

## Overview
The Products Management module allows admins to manage service categories and products dynamically in Firestore. All changes are reflected on the frontend service pages.

## Module Structure

```
/admin/products/
├── page.tsx                                    # Main dashboard - list all categories
├── categories/
│   ├── [categoryId]/
│   │   ├── page.tsx                           # Edit category
│   │   ├── detail/
│   │   │   └── page.tsx                       # View & manage products in category
│   │   └── products/
│   │       └── [productId]/
│   │           └── page.tsx                   # Add/Edit products
```

## Firestore Collections

### `products-categories` Collection
```
{
  id: string (auto-generated)
  name: string              # "PPF Wrapping", "Car Polishing", etc.
  slug: string              # "ppf-wrapping", "car-polishing", etc.
  description?: string      # Optional category description
  createdAt: Timestamp      # Auto-set on creation
  updatedAt: Timestamp      # Auto-updated on modifications
}
```

### `products` Collection
```
{
  id: string (auto-generated)
  categoryId: string        # Reference to products-categories doc
  name: string              # "Premium PPF Installation"
  description: string       # Detailed service description
  price: string             # "500" (AED currency)
  duration: string          # "2-3 hours"
  warranty: string          # "2 years"
  createdAt: Timestamp      # Auto-set on creation
  updatedAt: Timestamp      # Auto-updated on modifications
}
```

## How to Use

### 1. Create a Category
1. Go to `/admin/products`
2. Click "Add Category" button
3. Fill in:
   - **Category Name**: e.g., "PPF Wrapping"
   - **Slug**: e.g., "ppf-wrapping" (must match your service page URL)
   - **Description**: Optional description
4. Click "Create Category"

**Available Slugs** (must match service page URLs):
- `ppf-wrapping` → `/services/ppf-wrapping`
- `ceramic-coating` → `/services/ceramic-coating`
- `car-tinting` → `/services/car-tinting`
- `car-wash` → `/services/car-wash`
- `car-polishing` → `/services/car-polishing`

### 2. Add Products to a Category
1. From Products dashboard, click "View Products" for a category
2. Click "Add Product" button
3. Fill in:
   - **Product Name**: e.g., "Premium PPF Installation"
   - **Description**: Service details
   - **Price (AED)**: e.g., "500"
   - **Duration**: e.g., "2-3 hours"
   - **Warranty**: e.g., "2 years"
4. Click "Create Product"

### 3. Edit a Product
1. Go to category → View Products
2. Find the product and click the Edit (pencil) icon
3. Update fields as needed
4. Click "Update Product"

### 4. Delete a Product
1. Go to category → View Products
2. Click the Delete (trash) icon
3. Confirm deletion in the modal
4. Product is removed from Firestore

### 5. Edit a Category
1. From Products dashboard, click "Edit" for a category
2. Update name, slug, or description
3. Click "Update Category"

### 6. Delete a Category
1. From Products dashboard, click the Delete (trash) icon
2. This removes the category BUT keeps its products
3. Products can be reassigned to another category later

## Database Operations

### Firestore Functions (in `lib/firestore/products.ts`)

**Category Operations:**
```typescript
addCategory(data)                    # Create new category
getCategories()                      # Fetch all categories
updateCategory(id, data)             # Update category
deleteCategory(id)                   # Delete category
```

**Product Operations:**
```typescript
addProduct(data)                     # Create new product
getProductsByCategory(categoryId)    # Get products in category
getAllProducts()                     # Get all products
updateProduct(id, data)              # Update product
deleteProduct(id)                    # Delete product
```

## Frontend Integration (Next Steps)

### To make service pages dynamic:

1. **Update service pages** (`/services/[service]/page.tsx`):
```typescript
import { getProductsByCategory } from '@/lib/firestore/products';

// In your component:
const products = await getProductsByCategory('ppf-wrapping');
```

2. **Update ModalForm** to fetch products dynamically:
```typescript
import { getAllProducts } from '@/lib/firestore/products';

// Replace hardcoded services array with:
const services = await getAllProducts();
```

## Current Predefined Categories

The system supports these service categories (slugs):
- ✅ PPF Wrapping
- ✅ Ceramic Coating
- ✅ Car Tinting
- ✅ Car Wash
- ✅ Car Polishing

**Note:** These slugs must match your frontend service page URLs for proper navigation.

## Tips

1. **Slug is Critical**: The slug field MUST match your service page URL path (without `/services/`)
2. **Category Organization**: Each category should contain related products/services
3. **Product Pricing**: Use numeric values for prices (currency is AED)
4. **Warranty Field**: Can be flexible (e.g., "2 years", "Lifetime", "6 months")
5. **Duration Field**: Format as readable time (e.g., "2-3 hours", "1 day", "30 minutes")

## Common Use Cases

### Scenario 1: Add PPF options under PPF Wrapping
1. Create category "PPF Wrapping" with slug "ppf-wrapping"
2. Add multiple products:
   - Standard PPF Installation - AED 500
   - Premium PPF Installation - AED 750
   - Full Vehicle PPF - AED 1200

### Scenario 2: Manage pricing changes
1. Go to category → View Products
2. Click Edit on product
3. Update price field
4. Changes reflect immediately on frontend (once integrated)

### Scenario 3: Remove discontinued service
1. Find product in its category
2. Click Delete button
3. Confirm deletion

## Troubleshooting

**Category not showing:**
- Check if slug matches service page URL
- Verify Firestore has the document
- Ensure categoryId in products matches category id

**Products not appearing:**
- Check category ID is correct in products
- Verify products have categoryId field
- Check Firestore rules allow reads/writes

**Slug dropdown empty:**
- This is expected if you haven't created categories yet
- Predefined slugs are: ppf-wrapping, ceramic-coating, car-tinting, car-wash, car-polishing
- Contact dev if you need to add new service types

## File Locations

- **Main Dashboard**: `/app/admin/products/page.tsx`
- **Operations**: `/lib/firestore/products.ts`
- **Category Edit**: `/app/admin/products/categories/[categoryId]/page.tsx`
- **Product Manager**: `/app/admin/products/categories/[categoryId]/detail/page.tsx`
- **Product Form**: `/app/admin/products/categories/[categoryId]/products/[productId]/page.tsx`

---

**Last Updated**: January 2024
**Module Status**: ✅ Fully Functional

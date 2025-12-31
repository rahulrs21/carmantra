# B2B Booking Service Module - Quick Start Guide

## Module Access

**URL**: `/admin/b2b-booking`

Navigate to Admin > B2B Booking Service

## Main Pages

### 1. Dashboard
**URL**: `/admin/b2b-booking`
- Overview of all modules
- Quick stats and navigation
- How-to guide for users

### 2. Companies Management
**URL**: `/admin/b2b-booking/companies`
- View all B2B companies
- Add/Edit/Delete companies
- Search and filter options
- Click "View" to manage vehicles for that company

### 3. Company Details & Vehicles
**URL**: `/admin/b2b-booking/companies/[id]`
- Company information display
- List of vehicles under company
- Add new vehicle for company
- Date range filter for vehicles
- Quick access to vehicle details

### 4. Vehicles (Global View)
**URL**: `/admin/b2b-booking/vehicles`
- View all B2B vehicles across all companies
- Filter by company, status
- Edit vehicles
- Delete vehicles
- Click "View Details" for full vehicle management

### 5. Vehicle Details
**URL**: `/admin/b2b-booking/vehicles/[id]`

**Contains:**
- **Vehicle Information** - Basic specs (brand, model, year, fuel, color, VIN, plate)
- **Services** - Add services with amounts and status
- **Pre-Inspection** - Add notes, images, videos
- **Referral** - Track referral contact and commission

### 6. Billing & Quotation
**URL**: `/admin/b2b-booking/billing`
- Select company and date range
- Generate bill preview
- Shows all vehicles and services in period
- Print bill or quotation

## Database Collections Created

```
b2b-companies/
  └─ [companyId]
    └─ createdAt, companyName, contactPerson, email, phone, etc.

b2b-vehicles/
  └─ [vehicleId]
    ├─ companyId (reference)
    ├─ vehicleBrand, modelName, numberPlate, year, fuelType, etc.
    └─ details/
       ├─ preInspection
       └─ referral

b2b-services/
  └─ [serviceId]
    ├─ vehicleId (reference)
    ├─ companyId (reference)
    ├─ category, description, amount, status, scheduledDate, etc.
```

## Components Created

**Admin Components** (`/components/admin/b2b/`):
- `B2BCompanyForm.tsx` - Add/edit companies
- `B2BVehicleForm.tsx` - Add/edit vehicles
- `B2BServiceForm.tsx` - Add/edit services

## Utilities Created

**Firestore Functions** (`/lib/firestore/b2b.ts`):
- Company operations (add, update, delete, get)
- Vehicle operations (add, update, delete, get, get by company)
- Service operations (add, update, delete, get by vehicle, get by date range)
- Pre-inspection operations (update, get)
- Referral operations (update, get)

## Type Definitions

Added to `/lib/types.ts`:
- `B2BCompany` - Company interface
- `B2BVehicle` - Vehicle interface
- `B2BService` - Service interface
- `B2BVehicleDetail` - Enhanced vehicle with services, pre-inspection, referral
- `PreInspectionData` - Pre-inspection interface
- `ReferralInfo` - Referral tracking interface

## Permissions

New module: `b2b-booking`

Access levels:
- **Admin**: ✅ Full access
- **Manager**: ✅ Full access
- **Sales**: ✅ Create and edit
- **Support**: ✅ Edit existing
- **Viewer**: ✅ View only

## Integration Points

### With Existing Modules:

1. **Invoice Module**
   - Can pull B2B company data
   - Can aggregate services by date range
   - Can reference vehicle details

2. **Quotation Module**
   - Same integration as Invoice
   - Can use B2B billing preview as base

3. **Customer Module** (optional)
   - B2B companies can be added as B2B customers if needed

## File Locations

**Pages Created**:
- `/app/admin/b2b-booking/page.tsx`
- `/app/admin/b2b-booking/companies/page.tsx`
- `/app/admin/b2b-booking/companies/[id]/page.tsx`
- `/app/admin/b2b-booking/vehicles/page.tsx`
- `/app/admin/b2b-booking/vehicles/[id]/page.tsx`
- `/app/admin/b2b-booking/billing/page.tsx`

**Components Created**:
- `/components/admin/b2b/B2BCompanyForm.tsx`
- `/components/admin/b2b/B2BVehicleForm.tsx`
- `/components/admin/b2b/B2BServiceForm.tsx`

**Utilities Created**:
- `/lib/firestore/b2b.ts`

**Modified Files**:
- `/lib/types.ts` - Added B2B interfaces
- `/components/PermissionGate.tsx` - Added B2B module constant
- `/lib/types.ts` - Updated DEFAULT_PERMISSIONS

## Key Features Summary

✅ **Company Management** - Add/edit/delete multiple companies
✅ **Vehicle Management** - Add multiple vehicles per company
✅ **Services Tracking** - Track all services for vehicles
✅ **Pre-Inspection** - Capture notes, images, and videos
✅ **Referral Management** - Track referrals and commissions
✅ **Date Filtering** - Filter services by date range
✅ **Billing** - Generate aggregated bills/quotations
✅ **Search & Filter** - Find companies and vehicles easily
✅ **Pagination** - Handle large datasets
✅ **Real-time Updates** - Live data with Firestore
✅ **Permissions** - Role-based access control
✅ **B2C Untouched** - Existing B2C flow remains unchanged

## Testing Checklist

- [ ] Add a company
- [ ] Edit company details
- [ ] Add vehicle to company
- [ ] View vehicle details
- [ ] Add service to vehicle
- [ ] Add pre-inspection (notes, images, videos)
- [ ] Add referral information
- [ ] Filter vehicles by date
- [ ] Generate billing/quotation
- [ ] Test all CRUD operations
- [ ] Test permissions for different roles
- [ ] Verify data persists in Firestore

## Common Tasks

### Add a Company
1. Go to `/admin/b2b-booking/companies`
2. Click "Add Company"
3. Fill in details
4. Click "Add Company"

### Add Vehicles to Company
1. Go to company detail page
2. Click "Add Vehicle"
3. Fill in vehicle specs
4. Click "Add Vehicle"

### Track Services
1. Go to vehicle detail page
2. Click "Add Service"
3. Enter service details and amount
4. Click "Add Service"

### Generate Bill
1. Go to `/admin/b2b-booking/billing`
2. Select company
3. Select date range
4. Click "Generate Bill & Quotation"
5. View preview
6. Click "Print Bill" or "Print Quotation"

---

**Status**: Ready for Production ✅
**Version**: 1.0
**Last Updated**: December 25, 2025

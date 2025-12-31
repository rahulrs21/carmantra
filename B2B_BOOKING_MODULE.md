# B2B Booking Service Module Documentation

## Overview

The B2B Booking Service module has been successfully implemented as a separate system from the existing B2C booking service. It provides a hierarchical structure for managing companies, vehicles, and services with advanced features like pre-inspection tracking, referral management, and billing/quotation generation.

## Key Features

### 1. **Company Management** (`/admin/b2b-booking/companies`)
- Add multiple B2B companies with:
  - Company details (name, email, phone)
  - Contact person information
  - VAT and company code
  - Address and location details
  - Active/Inactive status
- Search, filter, and sort companies
- Edit and delete companies
- View company vehicles from company detail page

### 2. **Vehicle Management**

#### Company Vehicles View (`/admin/b2b-booking/companies/[id]`)
- Add vehicles directly under a specific company
- View all vehicles for the selected company
- Date range filtering for vehicles added within a period
- Quick actions (view details, edit, delete)

#### Global Vehicles View (`/admin/b2b-booking/vehicles`)
- View all B2B vehicles across all companies
- Filter by company, status, and search text
- Pagination and sorting
- Quick access to vehicle details

### 3. **Vehicle Detail Page** (`/admin/b2b-booking/vehicles/[id]`)

Each vehicle detail page contains four main sections:

#### a. **Vehicle Information**
- Basic vehicle specs (brand, model, year, fuel type, color, VIN, number plate)
- Immutable display of vehicle details

#### b. **Services Section**
- Add multiple services for the vehicle
- Track service details:
  - Service category (e.g., Car Wash, Ceramic Coating)
  - Description
  - Amount (in AED)
  - Status (pending, in-progress, completed, cancelled)
  - Scheduled date
- Edit and delete services
- Services aggregate for billing purposes

#### c. **Pre-Inspection Section**
- Capture pre-inspection notes (text field)
- Upload multiple images
- Upload multiple videos
- Track pre-inspection date automatically
- View existing pre-inspection media
- Edit and update pre-inspection data anytime

#### d. **Referral Section**
- Referral contact person details
- Phone and email
- Commission tracking:
  - Commission rate (%)
  - Total commission amount (AED)
- Additional notes
- Edit and update referral information

### 4. **Billing & Quotation Generation** (`/admin/b2b-booking/billing`)

Advanced billing module for generating aggregated bills and quotations:

**Features:**
- Select a company from dropdown
- Choose date range (start and end dates)
- Generate bill preview showing:
  - Company details
  - Contact person and VAT info
  - All vehicles under the company
  - All services within the date range grouped by vehicle
  - Individual service amounts
  - Total amount for the period
- Print bill
- Print quotation

**Logic:**
- Fetches all vehicles for the selected company
- Queries all services created within the date range
- Automatically aggregates multiple vehicles
- Calculates total amount from all services
- Provides clear breakdown by vehicle

## Database Structure

### Collections

#### `b2b-companies`
```typescript
{
  id: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  contactPerson: string;
  companyVat?: string;
  companyCode?: string;
  address?: string;
  city?: string;
  country?: string;
  state?: string;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `b2b-vehicles`
```typescript
{
  id: string;
  companyId: string;  // Reference to b2b-companies
  vehicleBrand: string;
  modelName: string;
  numberPlate: string;
  vin?: string;
  fuelType?: string;
  vehicleType?: string;
  color?: string;
  year?: number;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `b2b-services`
```typescript
{
  id: string;
  vehicleId: string;  // Reference to b2b-vehicles
  companyId: string;  // Reference to b2b-companies
  category: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  scheduledDate?: Timestamp;
  completedDate?: Timestamp;
  amount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `b2b-vehicles/{vehicleId}/details/preInspection` (Subcollection)
```typescript
{
  message?: string;
  images?: string[];  // Firebase Storage URLs
  videos?: string[];  // Firebase Storage URLs
  inspectionDate: Timestamp;
}
```

#### `b2b-vehicles/{vehicleId}/details/referral` (Subcollection)
```typescript
{
  referralContact?: string;
  referralPhone?: string;
  referralEmail?: string;
  commissionRate?: number;
  totalCommission?: number;
  notes?: string;
}
```

## API Endpoints & Firestore Functions

### Company Operations (`lib/firestore/b2b.ts`)

- `addB2BCompany(company)` - Create new company
- `updateB2BCompany(companyId, updates)` - Update company
- `deleteB2BCompany(companyId)` - Delete company
- `getB2BCompanyById(companyId)` - Fetch single company

### Vehicle Operations

- `addB2BVehicle(vehicle)` - Create vehicle
- `updateB2BVehicle(vehicleId, updates)` - Update vehicle
- `deleteB2BVehicle(vehicleId)` - Delete vehicle
- `getB2BVehicleById(vehicleId)` - Fetch vehicle with services, pre-inspection, and referral
- `getB2BVehiclesByCompanyId(companyId)` - Fetch all vehicles for company

### Service Operations

- `addB2BService(service)` - Create service
- `updateB2BService(serviceId, updates)` - Update service
- `deleteB2BService(serviceId)` - Delete service
- `getB2BServicesByVehicleId(vehicleId)` - Fetch services for vehicle
- `getB2BServicesByCompanyAndDateRange(companyId, startDate, endDate)` - Fetch services within date range

### Pre-Inspection Operations

- `updatePreInspection(vehicleId, preInspectionData)` - Save pre-inspection
- `getPreInspection(vehicleId)` - Fetch pre-inspection

### Referral Operations

- `updateReferral(vehicleId, referralData)` - Save referral info
- `getReferral(vehicleId)` - Fetch referral info

## File Structure

```
app/admin/b2b-booking/
├── page.tsx                           # Main B2B dashboard
├── companies/
│   ├── page.tsx                       # Companies list
│   └── [id]/
│       └── page.tsx                   # Company details & vehicles
├── vehicles/
│   ├── page.tsx                       # All vehicles list
│   └── [id]/
│       └── page.tsx                   # Vehicle detail with all sections
└── billing/
    └── page.tsx                       # Billing & quotation generation

components/admin/b2b/
├── B2BCompanyForm.tsx                 # Company form component
├── B2BVehicleForm.tsx                 # Vehicle form component
└── B2BServiceForm.tsx                 # Service form component

lib/firestore/
└── b2b.ts                             # All B2B Firestore operations
```

## Permissions & Access Control

Added B2B module to the permission system:

- **Admin**: Full access (view, create, edit, delete)
- **Manager**: Full access (view, create, edit, delete)
- **Sales**: View and create services, can edit (view, create, edit)
- **Support**: View only, can edit existing entries (view, edit)
- **Viewer**: View only (view)

Module name: `b2b-booking`

## Integration with Invoice/Quotation

The B2B module is designed to sync seamlessly with the existing Invoice and Quotation modules:

### Benefits:

1. **Shared Company Data** - B2B companies can be referenced in invoices
2. **Service Aggregation** - Services added in B2B module can be referenced when generating invoices
3. **Vehicle History** - Pre-inspection and service records provide complete vehicle history
4. **Billing Data** - The billing module generates data that can be used for invoice creation

### How to Integrate with Invoice Module:

When creating an invoice, you can:
1. Select a B2B company
2. Use the date range filter to find services completed in that period
3. The invoice will automatically pull:
   - Company details from `b2b-companies`
   - Vehicle details from `b2b-vehicles`
   - Service amounts from `b2b-services`

### Planned Enhancements:

1. Add "Create Invoice from Bill" button
2. Add "Create Quotation from Bill" button
3. Link pre-inspection images/videos to invoices
4. Track invoice history for each service

## Usage Flow

### Complete B2B Workflow:

1. **Admin adds a Company**
   - Navigate to `/admin/b2b-booking/companies`
   - Click "Add Company"
   - Fill in company details

2. **Admin adds Vehicles**
   - Go to company detail page
   - Click "Add Vehicle"
   - Add vehicle specifications

3. **Admin tracks Services**
   - Go to vehicle detail page
   - Add services with amounts and status

4. **Capture Pre-Inspection**
   - On vehicle detail page
   - Add inspection notes
   - Upload images/videos
   - Save pre-inspection

5. **Track Referrals** (optional)
   - Fill referral information
   - Track commission rates

6. **Generate Billing**
   - Navigate to `/admin/b2b-booking/billing`
   - Select company and date range
   - View bill preview
   - Print bill or quotation

## Technical Highlights

1. **Real-time Updates** - Uses Firestore onSnapshot for live data
2. **Scalability** - Hierarchical structure supports multiple companies with multiple vehicles
3. **Date Range Filtering** - Efficient Firestore queries with timestamp comparison
4. **File Storage** - Pre-inspection media stored in Firebase Storage with organized paths
5. **Type Safety** - Full TypeScript support with interfaces for all data structures
6. **Permission-based Access** - Role-based access control on all pages

## Notes for Code Changes

When making changes to Invoice or Quotation modules:

1. Check if B2B company selection is needed
2. Update data fetching to include B2B services if relevant
3. Ensure vehicle details are correctly referenced
4. Maintain consistency with B2B naming conventions
5. Add B2B mode toggle in Invoice/Quotation forms (if needed)

## Future Enhancements

1. Batch import/export of companies and vehicles
2. Advanced reporting and analytics
3. Integration with payment gateways for billing
4. SMS/Email notifications for service updates
5. Mobile app for pre-inspection capture
6. Inventory tracking for service materials
7. Maintenance schedule automation

---

**Module Status**: ✅ Complete
**Last Updated**: December 25, 2025
**Maintained By**: Development Team

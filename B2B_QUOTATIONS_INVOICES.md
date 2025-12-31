# B2B Quotations & Invoices Implementation Guide

## Overview
This document outlines the comprehensive B2B Quotations and Invoices system implementation, enabling users to:
- Create bulk quotations from multiple selected services with date filtering
- Manage quotation lifecycle (draft → sent → accepted → rejected)
- Generate invoices from accepted quotations
- Edit and track quotations and invoices

---

## 🏗️ Architecture

### Database Structure
```
companies/{companyId}/
  services/{serviceId}/
    quotations/{quotationId}
    invoices/{invoiceId}
```

### Key Features
1. **Date Filtering** - Filter services by date range before selecting
2. **Bulk Selection** - Check/uncheck services for batch quotation creation
3. **Quotation Management** - Create, edit, and delete quotations
4. **Invoice Generation** - Auto-create invoices from accepted quotations
5. **Status Tracking** - Monitor quotation and invoice status

---

## 📦 Files Created/Modified

### New Components
1. **QuotationList.tsx** - Display quotations with edit/download/delete
2. **InvoiceList.tsx** - Display invoices with edit/download/delete
3. **QuotationForm.tsx** - Modal form for editing quotations
4. **InvoiceForm.tsx** - Modal form for editing invoices
5. **BulkQuotationModal.tsx** - Modal for creating quotations from selected services

### Modified Components
1. **ServiceList.tsx** - Added date filter, checkboxes, bulk quotation button
2. **CompanyForm.tsx** - Fixed controlled input issue with TRN field
3. **CompanyList.tsx** - Added TRN column display

### New Services (lib/firestore/b2b-service.ts)
- `quotationsService` - CRUD operations for quotations
- `invoicesService` - CRUD operations for invoices

### New Hooks (hooks/useB2B.ts)
- `useQuotations()` - Fetch quotations for a service
- `useQuotationById()` - Fetch single quotation
- `useCreateQuotation()` - Create bulk quotation
- `useUpdateQuotation()` - Update quotation status/notes
- `useDeleteQuotation()` - Delete quotation
- `useInvoices()` - Fetch invoices for a service
- `useInvoiceById()` - Fetch single invoice
- `useCreateInvoice()` - Create invoice from quotation
- `useUpdateInvoice()` - Update invoice status/payment
- `useDeleteInvoice()` - Delete invoice

### Updated Pages
- **[id]/services/[serviceId]/page.tsx** - Added QuotationList and InvoiceList sections

---

## 🔄 Data Flow

### Creating a Quotation
```
Service List (with date filter + checkboxes)
    ↓
Select multiple services (same date range)
    ↓
Click "Create Quotation from Selected"
    ↓
BulkQuotationModal displays selected services
    ↓
Click "Create Quotation"
    ↓
quotationsService.createQuotation() is called
    ↓
Fetches all vehicles & referrals from selected services
    ↓
Generates quotation number & stores in Firestore
    ↓
QuotationList displays new quotation
```

### Creating an Invoice
```
Quotation must be in "accepted" status
    ↓
Click invoice button on Quotation
    ↓
invoicesService.createInvoice() is called
    ↓
Creates invoice from quotation data
    ↓
Stores in Firestore under service
    ↓
InvoiceList displays new invoice
```

### Editing Quotation/Invoice
```
Click edit button on quotation/invoice
    ↓
Open QuotationForm/InvoiceForm modal
    ↓
Display current details (read-only)
    ↓
Update status, notes, payment info
    ↓
Save changes to Firestore
    ↓
Refresh list to show updated data
```

---

## 📋 Data Models

### Quotation
```typescript
{
  id: string;
  quotationNumber: string;          // QT-XXXXX-YYYYY
  quotationDate: Timestamp;
  validUntil: Timestamp;
  
  // Company snapshot
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  
  // Services info
  serviceTitle: string;
  serviceIds: string[];
  
  // Vehicles from all selected services
  vehicles: Array<{
    serviceId: string;
    plateNumber: string;
    brand: string;
    model: string;
    year?: number;
    serviceCost: number;
  }>;
  
  // Referrals from all selected services
  referrals: Array<{
    serviceId: string;
    personName: string;
    contact: string;
    commission: number;
  }>;
  
  // Financial
  subtotal: number;
  referralTotal: number;
  totalAmount: number;
  
  // Status
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  notes?: string;
  
  // Metadata
  generatedAt: Timestamp;
  generatedBy: string;
}
```

### Invoice
```typescript
{
  id: string;
  invoiceNumber: string;            // INV-XXXXX-YYYYY
  invoiceDate: Timestamp;
  dueDate: Timestamp;
  
  // Company snapshot
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  
  // Service info
  serviceTitle: string;
  serviceIds: string[];
  
  // Vehicles & Referrals (from quotation)
  vehicles: Array<{ ... }>;
  referrals: Array<{ ... }>;
  
  // Financial
  subtotal: number;
  referralTotal: number;
  totalAmount: number;
  tax?: number;
  discount?: number;
  
  // Payment
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paidAmount?: number;
  paidDate?: Timestamp;
  paymentMethod?: string;
  
  // Notes
  notes?: string;
  
  // Metadata
  generatedAt: Timestamp;
  generatedBy: string;
}
```

---

## 🎯 Usage Instructions

### For Users

#### Creating a Bulk Quotation
1. Go to Company Details → Services section
2. Use date range filter to narrow services (optional)
3. Check boxes next to services to include in quotation
4. Click "Create Quotation from Selected"
5. Review selected services and amounts
6. Click "Create Quotation"
7. View created quotation in Quotations section

#### Updating Quotation Status
1. In Quotations section, click edit button
2. Change status: Draft → Sent → Accepted (or Rejected)
3. Add internal notes if needed
4. Save changes
5. When status = "Accepted", invoice button becomes active

#### Creating Invoice from Quotation
1. In Quotations section, find "accepted" quotation
2. Click the green invoice icon button
3. Invoice is automatically created with quotation details
4. View in Invoices section below

#### Managing Invoice
1. In Invoices section, click edit button
2. Update payment status: Draft → Sent → Paid (or Overdue/Cancelled)
3. Enter paid amount if applicable
4. Select payment method
5. Add notes
6. Save changes

---

## ⚙️ Technical Details

### Service Selection Logic
- Date filter updates `filteredServices` array
- Checkboxes are checked against `selectedServices` Set
- "Select All" checkbox checks/unchecks all filtered services
- Selection persists until bulk quotation is created

### Quotation Generation
- Automatically fetches ALL vehicles from ALL selected services
- Automatically fetches ALL referrals from ALL selected services
- Calculates subtotal (sum of vehicle service costs)
- Calculates referral total (sum of commission amounts)
- Generates unique quotation number with timestamp

### Invoice Prerequisites
- Can ONLY be created from quotations with status = "accepted"
- Invoice inherits all data from quotation
- Due date = Invoice date + 30 days (default)
- Can be edited after creation

### Status Workflows

**Quotation Lifecycle:**
```
draft ──→ sent ──→ accepted ──→ (invoice created)
  ↓                    ↓
  └────→ rejected      └→ invoice status

OR immediate rejection:
draft ──→ rejected
```

**Invoice Lifecycle:**
```
draft ──→ sent ──→ paid
  ↓                ↓
  └────→ overdue ──┘
  ↓
  └────→ cancelled
```

---

## 🔒 Firestore Security Rules
Ensure these rules are in place:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{companyId}/services/{serviceId} {
      // Quotations
      match /quotations/{quotationId} {
        allow read, write: if request.auth != null;
      }
      
      // Invoices
      match /invoices/{invoiceId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

---

## 📝 Form Validation

### Quotation Form
- Status: required, enum (draft, sent, accepted, rejected)
- Notes: optional string

### Invoice Form
- Status: required, enum (draft, sent, paid, overdue, cancelled)
- Paid Amount: optional, minimum 0
- Payment Method: optional string
- Notes: optional string

---

## 🚀 Future Enhancements

1. **PDF Generation**
   - Implement quotation PDF with company logo
   - Implement invoice PDF with payment terms
   - Download functionality

2. **Email Integration**
   - Send quotation via email
   - Send invoice via email
   - Automatic reminders for overdue invoices

3. **Templates**
   - Quotation templates with custom terms
   - Invoice templates with tax calculations
   - Multi-currency support

4. **Advanced Filtering**
   - Filter by status
   - Filter by date range in list view
   - Search by quotation/invoice number

5. **Reporting**
   - Quotation acceptance rate
   - Invoice payment status reports
   - Revenue tracking

6. **Notifications**
   - Email when quotation is accepted
   - Alert when invoice is overdue
   - Real-time updates

---

## 🔧 Troubleshooting

### Quotation not appearing after creation
- Verify user is authenticated
- Check Firestore rules allow write access
- Check browser console for errors
- Try manual page refresh

### Cannot create invoice
- Ensure quotation status is "accepted"
- Check Firestore rules for invoice collection
- Verify user authentication

### Data not syncing
- Check React Query cache invalidation
- Verify Firestore collection paths
- Check network requests in DevTools

---

## 📞 Support

For issues or questions:
1. Check the code comments for detailed explanations
2. Review console logs for error messages
3. Verify Firestore data structure matches schema
4. Ensure all required fields are present

---

Generated: December 27, 2025

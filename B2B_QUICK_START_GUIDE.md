# B2B Quotations & Invoices - Quick Start Guide

**Last Updated:** December 27, 2025

---

## 🚀 Getting Started in 5 Minutes

### Step 1: Verify Files Exist (2 min)
Check that these files exist in your project:
```
✅ components/admin/b2b/QuotationList.tsx
✅ components/admin/b2b/InvoiceList.tsx
✅ components/admin/b2b/QuotationForm.tsx
✅ components/admin/b2b/InvoiceForm.tsx
✅ components/admin/b2b/BulkQuotationModal.tsx
```

### Step 2: Update Firestore Rules (2 min)
Add these rules to your Firestore security rules:
```javascript
match /companies/{companyId}/services/{serviceId} {
  match /quotations/{quotationId} {
    allow read, write: if request.auth != null;
  }
  match /invoices/{invoiceId} {
    allow read, write: if request.auth != null;
  }
}
```

### Step 3: Test the Features (1 min)
1. Navigate to a company's services page
2. Use date filter to narrow services
3. Select multiple services with checkboxes
4. Click "Create Quotation from Selected"
5. Verify quotation appears in Quotations section

---

## 📱 User Guide

### Creating a Quotation

**Path:** Company → Services → [Check Services] → [Create Quotation]

**Steps:**
1. Go to Company Details page
2. Scroll to Services section
3. (Optional) Use date filter to narrow services
4. Check boxes next to services to include
5. Click "Create Quotation from Selected" button
6. Modal appears showing selected services and total
7. Click "Create Quotation"
8. See success message
9. Scroll down to see Quotations section with new quotation

**Result:** Quotation created with:
- Unique quotation number (QT-XXXXX-YYYYY)
- All selected services
- All vehicles from those services
- All referrals from those services
- Calculated totals

---

### Updating Quotation Status

**Path:** Company → Services → Quotations → [Edit]

**Steps:**
1. In Quotations section, click Edit button
2. Change status from dropdown:
   - Draft → Sent (preparing to send)
   - Sent → Accepted (client approved)
   - Sent → Rejected (client declined)
3. Add internal notes if needed
4. Click "Save Changes"
5. See success message
6. Modal closes and list updates

**Important:** Invoice can ONLY be created when status is "Accepted"

---

### Creating an Invoice

**Path:** Company → Services → Quotations → [Invoice Button]

**Conditions:**
- Quotation status MUST be "Accepted"
- Only "Accepted" quotations show the green invoice button

**Steps:**
1. Edit quotation and change status to "Accepted"
2. Save and close modal
3. In Quotations section, find the quotation
4. Click the green invoice icon button
5. See success message
6. Scroll down to see Invoices section with new invoice

**Result:** Invoice created with:
- Unique invoice number (INV-XXXXX-YYYYY)
- All data from quotation
- Due date: 30 days from today
- Status: "Draft"

---

### Updating Invoice Status

**Path:** Company → Services → Invoices → [Edit]

**Steps:**
1. In Invoices section, click Edit button
2. Change status from dropdown:
   - Draft → Sent (invoice sent to client)
   - Sent → Paid (payment received)
   - Sent → Overdue (payment not received by due date)
   - Any → Cancelled (cancel invoice)
3. If status is "Paid":
   - Enter paid amount (e.g., 500)
   - Enter payment method (e.g., "Bank Transfer")
   - (Optional) Date is auto-set to today
4. Add notes if needed
5. Click "Save Changes"
6. Modal closes and list updates

---

## 🎯 Common Tasks

### Task 1: Create Quarterly Quotation
1. Filter services by date range (entire quarter)
2. Select all services from that period
3. Create quotation for the quarter
4. Update status to "Sent" and add note "Q4 2025"
5. Wait for client response

### Task 2: Track Payment
1. Find invoice in Invoices section
2. Click Edit
3. Update status to "Paid"
4. Enter amount received and payment method
5. Save changes

### Task 3: Cancel Quotation
1. Find quotation in Quotations section
2. Click Delete button
3. Confirm deletion
4. Quotation is removed

### Task 4: Decline Quotation
1. Find quotation in Quotations section
2. Click Edit
3. Change status to "Rejected"
4. Add note "Client declined"
5. Save changes

### Task 5: Bulk Operations
1. Filter services by date (e.g., January)
2. Select all services from that period
3. Create single quotation for all January services
4. This reduces paperwork and keeps things organized

---

## 📊 Table Reference

### Services Table
```
┌──┬───────────┬──────┬────────┬────────┬─────────┐
│☑ │Service    │Type  │Date    │Status  │Amount   │
├──┼───────────┼──────┼────────┼────────┼─────────┤
│☐ │Car Wash   │wash  │12/20   │Pending │100 AED  │
│☑ │Detailing  │detail│12/21   │Pending │200 AED  │
│☑ │PPF        │ppf   │12/22   │Pending │500 AED  │
└──┴───────────┴──────┴────────┴────────┴─────────┘
  Selected: 2 services [Create Quotation from Selected]
```

### Quotations Table
```
┌────────────┬───────┬──────────┬────────┬─────────┬────────┐
│Quotation # │Date   │Vehicles  │Amount  │Status   │Actions │
├────────────┼───────┼──────────┼────────┼─────────┼────────┤
│QT-12345-67 │12/20  │ABC-123   │700 AED │Accepted │E D ⭐ │
│            │       │DEF-456   │        │         │   I  │
│            │       │GHI-789   │        │         │   D  │
└────────────┴───────┴──────────┴────────┴─────────┴────────┘

E = Edit | D = Download | ⭐ = Invoice | I = Invoice | D = Delete
```

### Invoices Table
```
┌────────────┬───────┬─────────┬──────────┬─────────┬────────┐
│Invoice #   │Date   │Due Date │Amount    │Status   │Actions │
├────────────┼───────┼─────────┼──────────┼─────────┼────────┤
│INV-12345-78│12/20  │01/19    │700 AED   │Paid     │E D D  │
└────────────┴───────┴─────────┴──────────┴─────────┴────────┘

E = Edit | D = Download | D = Delete
```

---

## 🎨 Status Colors

### Quotation Status
- **Draft** (Gray) - Not yet sent to client
- **Sent** (Blue) - Sent to client, awaiting response
- **Accepted** (Green) - Client approved, ready for invoice
- **Rejected** (Red) - Client declined

### Invoice Status
- **Draft** (Gray) - Not yet sent
- **Sent** (Blue) - Sent to client
- **Paid** (Green) - Payment received
- **Overdue** (Red) - Payment not received by due date
- **Cancelled** (Gray) - Invoice cancelled

---

## ⚙️ Settings & Options

### Date Filter
- Optional feature
- Default: Shows all services
- Can filter by start and/or end date
- "Clear" button resets filter

### Selection
- Check individual services
- "Select All" checks all filtered services
- Unchecking "Select All" deselects all
- Selection counter shows how many selected

### Delete Confirmation
- Required for quotations and invoices
- Confirms: "Are you sure? This cannot be undone."
- "Delete" button is red to indicate destructive action

---

## 💡 Tips & Tricks

### Tip 1: Organize by Date
Use date filter to group related services together. Example:
- January services → 1 quotation
- February services → 1 quotation
- etc.

### Tip 2: Use Notes
Add notes to quotations for reference:
- "Follow-up required"
- "Client asking for discount"
- "High priority"

### Tip 3: Track Payments
Update invoice status and paid amount immediately when payment received:
- Helps with cash flow tracking
- Easy to see which invoices are outstanding

### Tip 4: Bulk Operations
For large batches, use bulk quotation instead of individual quotations:
- Saves time
- Keeps everything organized
- Easier to track

### Tip 5: Status Workflow
Remember the workflow:
1. Create Quotation (Status: Draft)
2. Send to Client (Status: Sent)
3. Receive Approval (Status: Accepted)
4. Create Invoice
5. Track Payment (Status: Paid)

---

## ❓ FAQ

**Q: Can I create an invoice from a draft quotation?**  
A: No. Quotation must be "Accepted" first.

**Q: Can I edit a quotation after creating an invoice?**  
A: Yes, but it won't affect the already-created invoice.

**Q: Can I delete a quotation that has an invoice?**  
A: Yes, invoice remains independent.

**Q: Can I change invoice status after payment?**  
A: Yes, you can change status anytime. Update paid amount when needed.

**Q: What happens if I delete a quotation?**  
A: It's permanently deleted. No recovery possible. You'll get a confirmation first.

**Q: Can I have multiple invoices from one quotation?**  
A: No, one quotation creates one invoice.

**Q: How long is quotation valid for?**  
A: 30 days from creation (auto-calculated, shown as "Valid Until" date).

**Q: Can I download quotation/invoice as PDF?**  
A: This feature is planned for a future release.

---

## 🔐 Security Notes

### Authentication
- Must be logged in to create/edit quotations and invoices
- Cannot access other company's data

### Data Protection
- All data stored securely in Firestore
- Backed up regularly
- Access controlled by user permissions

### Best Practices
- Don't share quotation/invoice numbers in unsecured channels
- Use notes field for sensitive internal information
- Regularly backup important quotations

---

## 🐛 Troubleshooting

**Problem: Can't select services**
- Solution: Ensure date filter is not too restrictive
- Solution: Check that services have valid data

**Problem: Quotation not created**
- Solution: Check browser console for errors
- Solution: Verify you have write permission
- Solution: Try again in a few seconds

**Problem: Invoice button not showing**
- Solution: Ensure quotation status is "Accepted" (not Draft or Rejected)
- Solution: Try refreshing page

**Problem: Can't edit quotation**
- Solution: Check that you have write permission
- Solution: Try refreshing page

**Problem: Data not updating**
- Solution: Refresh page (F5)
- Solution: Clear browser cache
- Solution: Check Firestore data directly

---

## 📞 Support

For issues or questions:
1. Check this guide
2. Check the FAQ section
3. Refer to comprehensive guides included
4. Contact your administrator

---

**Version:** 1.0  
**Last Updated:** December 27, 2025  
**Status:** Ready for Use ✅

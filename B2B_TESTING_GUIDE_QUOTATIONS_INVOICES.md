# B2B Quotations & Invoices - Testing & Usage Guide

## 🧪 Testing Procedures

### Setup
1. Ensure you have a company with at least 2-3 services
2. Each service should have at least 1 vehicle with a cost
3. Services should have different dates (for date filtering tests)

### Test 1: Date Filtering
**Steps:**
1. Navigate to Company Details page
2. Scroll to Services section
3. Enter Start Date: Today
4. Enter End Date: Today + 7 days
5. Verify only services within date range appear
6. Clear filters
7. Verify all services reappear

**Expected Result:** ✅ Services are filtered correctly, checkboxes reset

---

### Test 2: Service Selection
**Steps:**
1. On Services section, check one service checkbox
2. Verify "1 service(s) selected" appears
3. Check another service
4. Verify "2 service(s) selected" appears
5. Check "Select All" checkbox
6. Verify all visible services are checked
7. Uncheck "Select All"
8. Verify all are unchecked

**Expected Result:** ✅ Checkboxes work correctly, count updates properly

---

### Test 3: Create Bulk Quotation
**Steps:**
1. Select 2-3 services
2. Click "Create Quotation from Selected"
3. Verify BulkQuotationModal opens
4. Verify selected services are listed with amounts
5. Verify total amount is calculated correctly
6. Click "Create Quotation"
7. Wait for success toast
8. Scroll to Quotations section
9. Verify new quotation appears

**Expected Result:** ✅ Quotation is created and displayed

**Quotation Details Check:**
- Quotation number format: QT-XXXXX-YYYYY ✅
- All services listed ✅
- All vehicles listed ✅
- Subtotal calculated ✅
- Referral total calculated ✅
- Grand total correct ✅
- Status = "draft" ✅

---

### Test 4: Edit Quotation
**Steps:**
1. In Quotations section, click Edit button
2. Verify QuotationForm modal opens
3. Verify company/service/vehicle info is displayed (read-only)
4. Verify totals are shown
5. Change Status to "sent"
6. Add notes: "Test quotation"
7. Click "Save Changes"
8. Wait for success toast
9. Verify modal closes
10. Verify quotation list refreshes
11. Verify status badge now shows "sent"

**Expected Result:** ✅ Quotation is updated, status changes reflected

---

### Test 5: Create Invoice from Quotation
**Steps:**
1. In Quotations section, edit a quotation
2. Change status to "accepted"
3. Save and close
4. Verify green invoice icon appears on quotation row
5. Click invoice button
6. Wait for success toast
7. Scroll to Invoices section
8. Verify new invoice appears

**Expected Result:** ✅ Invoice created with accepted quotation data

**Invoice Details Check:**
- Invoice number format: INV-XXXXX-YYYYY ✅
- All vehicles from quotation ✅
- All referrals from quotation ✅
- Total amount matches quotation ✅
- Status = "draft" ✅
- Due date = today + 30 days ✅

---

### Test 6: Edit Invoice
**Steps:**
1. In Invoices section, click Edit button
2. Verify InvoiceForm modal opens
3. Verify company/service/vehicle info displayed
4. Verify totals shown
5. Change Status to "sent"
6. Enter Paid Amount: 500
7. Payment Method: "Bank Transfer"
8. Add notes: "Test payment"
9. Click "Save Changes"
10. Verify modal closes
11. Verify invoice updated

**Expected Result:** ✅ Invoice updated with payment details

---

### Test 7: Delete Quotation
**Steps:**
1. In Quotations section, click Delete button
2. Verify confirmation dialog appears
3. Click "Delete"
4. Wait for success toast
5. Verify quotation removed from list

**Expected Result:** ✅ Quotation deleted successfully

---

### Test 8: Delete Invoice
**Steps:**
1. In Invoices section, click Delete button
2. Verify confirmation dialog appears
3. Click "Delete"
4. Wait for success toast
5. Verify invoice removed from list

**Expected Result:** ✅ Invoice deleted successfully

---

### Test 9: Invoice Can't Be Created from Non-Accepted Quotation
**Steps:**
1. Create a new quotation (status = draft)
2. Verify invoice button is NOT visible
3. Edit quotation, change status to "rejected"
4. Verify invoice button is NOT visible
5. Edit quotation, change status to "sent"
6. Verify invoice button is NOT visible
7. Edit quotation, change status to "accepted"
8. Verify invoice button IS visible (green icon)

**Expected Result:** ✅ Invoice button only visible for accepted quotations

---

### Test 10: Data Persistence
**Steps:**
1. Create a quotation with multiple services
2. Refresh page (F5)
3. Navigate to Company Details
4. Scroll to Quotations section
5. Verify quotation still exists
6. Edit quotation and change status
7. Refresh page
8. Verify status change persisted

**Expected Result:** ✅ All data persists in Firestore

---

## 🔍 Data Verification Checklist

### Quotation Data
```
✅ quotationNumber (format: QT-XXXXX-YYYYY)
✅ quotationDate (timestamp)
✅ validUntil (30 days from creation)
✅ companyName (from company record)
✅ contactPerson (from company record)
✅ phone (from company record)
✅ email (from company record)
✅ serviceTitle (list of all selected services)
✅ serviceIds (array of selected service IDs)
✅ vehicles (array with all vehicles from all services)
✅ referrals (array with all referrals from all services)
✅ subtotal (sum of vehicle costs)
✅ referralTotal (sum of commissions)
✅ totalAmount (subtotal + referralTotal)
✅ status (draft, sent, accepted, rejected)
✅ notes (optional)
✅ generatedAt (timestamp)
✅ generatedBy (user ID)
```

### Invoice Data
```
✅ invoiceNumber (format: INV-XXXXX-YYYYY)
✅ invoiceDate (timestamp)
✅ dueDate (30 days from creation)
✅ companyName (from quotation)
✅ contactPerson (from quotation)
✅ phone (from quotation)
✅ email (from quotation)
✅ serviceTitle (from quotation)
✅ serviceIds (from quotation)
✅ vehicles (from quotation)
✅ referrals (from quotation)
✅ subtotal (from quotation)
✅ referralTotal (from quotation)
✅ totalAmount (from quotation)
✅ status (draft, sent, paid, overdue, cancelled)
✅ paidAmount (optional)
✅ paidDate (optional)
✅ paymentMethod (optional)
✅ notes (optional)
✅ generatedAt (timestamp)
✅ generatedBy (user ID)
```

---

## 🐛 Common Issues & Solutions

### Issue: Quotation not appearing after creation
**Solution:**
1. Check browser console for errors
2. Verify Firestore rules allow write
3. Check Firestore data exists in console
4. Try manual page refresh

### Issue: "Cannot create invoice" error
**Solution:**
1. Ensure quotation status is "accepted"
2. Check Firestore rules for invoices collection
3. Verify user is authenticated
4. Check browser console for detailed error

### Issue: Quotation edit form shows old data
**Solution:**
1. Clear browser cache
2. Hard refresh page (Ctrl+Shift+R)
3. Check if quotation exists in Firestore

### Issue: Date filter not working
**Solution:**
1. Verify date values are valid
2. Check service dates in data
3. Try clearing and re-entering dates

---

## 📊 Performance Testing

### Large Dataset Test
1. Create company with 100 services
2. Create 20 quotations
3. Create 10 invoices
4. Measure load time
5. Verify UI responsiveness

**Expected:** Load time < 2 seconds, smooth scrolling

### Concurrent Operations Test
1. Open multiple windows/tabs
2. Edit quotation in one
3. Refresh in another
4. Verify data consistency

**Expected:** Data consistent across all windows

---

## 🔐 Security Testing

### Authentication
- [ ] Non-authenticated users cannot create quotations/invoices
- [ ] Cannot access other company's quotations
- [ ] Cannot modify quotations created by others

### Data Validation
- [ ] Cannot save quotation with invalid data
- [ ] Cannot create invoice from draft quotation
- [ ] Cannot delete referenced invoices

### Firestore Rules
Verify these in Firestore console:
```
companies/{companyId}/services/{serviceId}/quotations
  ✅ Can read/write if authenticated
  
companies/{companyId}/services/{serviceId}/invoices
  ✅ Can read/write if authenticated
```

---

## 📝 Acceptance Criteria

- [x] Date filtering works on services
- [x] Bulk selection works
- [x] Quotation creation works
- [x] Quotation edit form works
- [x] Quotation status transitions work
- [x] Invoice creation from accepted quotation works
- [x] Invoice edit form works
- [x] Invoice status tracking works
- [x] Delete operations work with confirmation
- [x] Toast notifications appear
- [x] Data persists on refresh
- [x] Responsive design works
- [x] Error handling works
- [ ] PDF download implemented (TODO)
- [ ] Email notifications implemented (TODO)

---

## 🎓 User Training Points

1. **Date filtering** helps organize services
2. **Bulk selection** is faster than one-by-one
3. **Quotation status** must be "accepted" before invoice
4. **Invoice due date** automatically calculated as +30 days
5. **Payment tracking** helps follow cash flow
6. **Notes field** allows internal comments

---

## 📞 Support Contacts

For issues:
1. Check console errors first
2. Review this guide
3. Check Firestore data structure
4. Contact development team with:
   - Error message
   - Steps to reproduce
   - Browser/device info
   - Screenshots if applicable

---

Generated: December 27, 2025
Last Updated: 2024-12-27

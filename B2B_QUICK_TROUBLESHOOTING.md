# B2B Services - Quick Troubleshooting

## Services Not Storing or Displaying?

### ✅ Verification Checklist

**1. Check you're on correct page**
- URL should be: `http://localhost:3000/admin/b2b-booking/companies/{companyId}`
- You should see company name and details
- Services section says "No services added yet"

**2. Check user is authenticated**
- Login as admin user
- You should see "Administrator" in top-left corner
- Check browser console (F12) → Application → Local Storage → `user_uid` should have a value

**3. Click "Add New Service" button**
- Should open dialog modal
- Fill in:
  - Service Title: "Test Service"
  - Service Type: "car-wash"
  - Service Date: Today's date

**4. Click "Create Service"**
- Should show success toast
- Modal should close
- Service should appear in table below

**5. If service appears**
- ✅ Everything is working!
- Click the service to view details
- Try adding a vehicle

**6. If service doesn't appear**
- ❌ Check the following steps below

---

## Troubleshooting Steps

### Problem: Service form doesn't submit

**Solution 1: Check browser console**
1. Open DevTools (F12)
2. Go to "Console" tab
3. Look for errors in red
4. Copy/paste the error

**Solution 2: Check all fields filled**
- Service Title: Required (not empty)
- Service Type: Required (select from dropdown)
- Service Date: Required (pick a date)

**Solution 3: Check authentication**
- Logout and login again
- Verify admin role is set

---

### Problem: Service created but doesn't appear in list

**Solution 1: Check Firestore**
1. Go to Firebase Console: https://console.firebase.google.com
2. Select project "carmantra"
3. Firestore Database
4. Click "companies" collection
5. Click on your company document
6. Click "services" subcollection
7. **You should see your service document here**

**If service is in Firestore but not showing:**
- Refresh the page (F5)
- Clear browser cache (Ctrl+Shift+Delete)
- Try private/incognito window

**Solution 2: Check query is correct**
- Open browser Console
- Look for logs like: `[servicesService] Found services: 1`
- This means the query returned results

**Solution 3: Check Firestore rules**
- In Firebase Console → Firestore → Rules
- Should allow `isAuthenticated()` users to read/create
- Rules should have section for `/companies/{companyId}/services`

---

### Problem: Console shows error "Undefined field value"

**This means:**
- Field is being sent as `undefined` to Firestore
- Firestore doesn't allow undefined values

**Solution:**
- Clear browser cache
- Reload page
- Try again
- If persists, check if field marked as required but empty

---

### Problem: Console shows "collection() requires 2 arguments"

**This means:**
- Code is trying to access collection with wrong path
- Should be fixed in new code

**Solution:**
- Clear all cache
- Hard refresh (Ctrl+Shift+R)
- Verify you have latest code from GitHub

---

### Problem: Service created but fields are missing/wrong

**Check field mappings:**

Correct fields for Service:
- ✅ title
- ✅ type
- ✅ serviceDate
- ✅ status ("pending")
- ✅ totalAmount (0)
- ✅ subtotal (0)
- ✅ referralTotal (0)
- ✅ notes (optional)
- ✅ createdAt, createdBy, updatedAt

**If you see:**
- ❌ companyName → Should be in company, not service
- ❌ vehicleBrand → Should be in vehicle, not service
- ❌ undefined → Field shouldn't be saved

---

## Browser Console Logs

### ✅ What you should see (success):

```
[ServiceForm] Submitting form with data: {...}
[ServiceForm] Calling createService.mutateAsync with: {...}
[b2b-service] createService called with: {...}
[b2b-service] Saving service to Firestore: {...}
[b2b-service] Service created successfully: {...}
[servicesService] Fetching services for company: ...
[servicesService] Found services: 1
```

### ❌ What indicates errors:

```
[ServiceForm] Error creating service: ...
[b2b-service] Error creating service: ...
Uncaught TypeError: ...
Cannot read property 'uid' of undefined  // User not logged in
```

---

## Quick Fix Steps

### If services still not working:

1. **Hard refresh page**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

2. **Clear all cache**
   - F12 → Application → Storage → Clear Site Data
   - Or Ctrl+Shift+Delete

3. **Logout and login**
   - Click Logout in sidebar
   - Login again with admin user

4. **Check network requests**
   - F12 → Network tab
   - Create service
   - Look for `/companies/{id}/services` write request
   - Should see 200/201 response

5. **Check Firestore directly**
   - Firebase Console → Firestore
   - companies → your company → services
   - Refresh the collection
   - You should see the service document

6. **Share error from console**
   - If error persists:
     - Copy error message from console
     - Check the exact path being used
     - Share with developer

---

## Expected Behavior After Fix

✅ Service form opens  
✅ Form validates input  
✅ Submit button works  
✅ Success toast appears  
✅ Modal closes  
✅ Service appears in table  
✅ Service has correct status, date, amount  
✅ Can click service to view details  
✅ Can add vehicles to service  
✅ Can create referrals  

---

## Collection Paths

After fix, services should be stored here:

```
Firestore Database
└── companies
    └── gMdD14jpbJlCqptMCMMD  (your company ID)
        └── services  (subcollection)
            ├── service-id-1
            │   ├── title: "Car Wash"
            │   ├── type: "car-wash"
            │   ├── serviceDate: Timestamp
            │   └── status: "pending"
            ├── service-id-2
            │   └── ...
```

Not here (this was broken):
```
b2b-services  ❌ This path no longer used
b2b-companies ❌ This path no longer used
```

---

## Still Not Working?

If you follow all steps and services still don't work:

1. **Check Firestore Rules**
   - Firebase Console → Firestore → Rules
   - Look for: `match /companies/{companyId}/services`
   - Should allow: `allow read, create, update`

2. **Check user has admin role**
   - Firebase Console → Firestore → users collection
   - Click your user document
   - Should have: `role: "admin"`

3. **Check userId is being passed**
   - Open console
   - Create service
   - Look for log: `userId: "your-user-id"`
   - If shows `userId: ""` or missing → User not authenticated

4. **Check Firestore quota**
   - Firebase Console → Usage
   - Check if quota exceeded
   - Reset or upgrade if needed

---

## Success Indicators

When you see these, everything is fixed:

✅ Service appears immediately after creation  
✅ Can see it in Firestore under correct collection path  
✅ Service has all required fields  
✅ Can click "View" to navigate to service details  
✅ Can add vehicles to the service  
✅ "Add New Vehicle" button appears on service detail page  
✅ Vehicles appear in table on service page  

---

## Contact Developer

If you've tried all these and it still doesn't work:

Share these details:
1. Screenshot of error (if any)
2. Console logs (copy/paste from F12)
3. Company ID you're testing with
4. User email/ID
5. Steps you took before error occurred

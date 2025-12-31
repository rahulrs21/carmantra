# B2B Vehicle Detail Page - Diagnostic Guide

## What Was Fixed

### 1. ✅ Vehicle Detail Fetch Function
- **File**: `lib/firestore/b2b.ts`
- **Issue**: Was trying to fetch subcollections that don't exist
- **Fix**: Now fetches pre-inspection and referral data from the main document field

### 2. ✅ Enhanced Error Logging
- **File**: `app/admin/b2b-booking/vehicles/[id]/page.tsx`
- **Additions**:
  - Added error state to track and display errors
  - Console logs at each fetch step
  - Better error messages showing what went wrong
  - Back button when vehicle not found

### 3. ✅ Vehicle List Logging
- **File**: `app/admin/b2b-booking/vehicles/page.tsx`
- **Additions**:
  - Console logs for company and vehicle fetching
  - Logs show count of items loaded

---

## Testing Steps

### Step 1: Test Vehicle List
1. Go to Admin → B2B Booking → Vehicles
2. Open Browser Console (F12)
3. Look for logs:
   ```
   "Fetching companies..."
   "Companies loaded: [number]"
   "Fetching vehicles..."
   "Vehicles loaded: [number]"
   ```
4. If you see errors, they'll be logged

### Step 2: Test Vehicle Details
1. Click "View" on any vehicle in the list
2. Check browser console for:
   ```
   "Starting to fetch vehicle: [vehicleId]"
   "Vehicle fetched: {vehicle object}"
   "Setting vehicle state"
   "Services loaded: [number]"
   "Pre-inspection data: ..."
   "Referral data: ..."
   "Vehicle detail loaded successfully"
   ```

### Step 3: If Error Occurs
You'll see:
```
Error: [specific error message]
"Check the browser console for more details"
```

And in the console:
```
Error fetching vehicle: [full error details]
```

---

## Common Issues & Solutions

| Issue | Console Log | Solution |
|-------|-------------|----------|
| Vehicle not loading | `Vehicle fetched: null` | Vehicle ID might not exist |
| Services not showing | `Services loaded: 0` | No services created yet (normal) |
| Permission error | `FirebaseError: Missing permissions` | Check Firestore rules allow `read: if true` |
| Network error | `Network error: ...` | Check internet connection |

---

## Firestore Rules Reminder

Your rules allow public read/write:
```firestore
match /b2b-vehicles/{document=**} { 
  allow read: if true;
  allow write: if true;
}
```

This means:
✅ Anyone can read vehicles  
✅ Anyone can create/edit/delete vehicles  
✅ No permission errors should occur

---

## Browser Console Commands

While on vehicle detail page, you can test:

```javascript
// Check if vehicle data is loaded
window.vehicle  // Shows loaded vehicle

// Check localStorage for auth
console.log(localStorage)
```

---

## Data Flow

```
1. User clicks "View" button on vehicles list
   ↓
2. Router navigates to /admin/b2b-booking/vehicles/[vehicleId]
   ↓
3. Page component loads, useEffect triggers
   ↓
4. getB2BVehicleById(vehicleId) called
   ↓
5. Fetches from:
   - b2b-vehicles collection (main data)
   - b2b-services collection (services by vehicleId)
   ↓
6. State updated with vehicle data
   ↓
7. Page renders with vehicle details
```

---

## Next Actions if Still Not Working

1. **Check Firestore Console**:
   - Go to Firebase Console → Firestore
   - Look for `b2b-vehicles` collection
   - Verify documents exist with correct structure

2. **Verify Firestore Rules Deployed**:
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Check Browser Network Tab** (F12 → Network):
   - Look for failed requests to firestore
   - Check response status codes

4. **Clear Cache & Reload**:
   - Ctrl+Shift+Delete (delete cache)
   - Reload page (Ctrl+R)

---

## Expected Vehicle Data Structure

Documents in `b2b-vehicles` should have:
```javascript
{
  vehicleBrand: "Toyota",
  modelName: "Camry",
  numberPlate: "ABC 123",
  companyId: "company-id-here",
  year: 2023,
  fuelType: "Petrol",
  color: "Silver",
  vin: "VIN123456",
  status: "active",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // Optional fields
  preInspection: { message: "", images: [], videos: [] },
  referral: { ... },
  services: [ ... ]  // Will be populated from b2b-services
}
```


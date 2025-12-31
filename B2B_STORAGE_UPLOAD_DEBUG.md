# B2B Storage Upload - Debug & Fix Guide

## What's Been Fixed

✅ **Enhanced Error Handling**: Now shows specific error messages instead of generic "Failed to save"
✅ **Detailed Console Logging**: Every step of the upload process is logged
✅ **Better Status Display**: Error messages are more visible with color-coded alerts
✅ **File-by-File Tracking**: Logs which file is being uploaded and at what step

---

## Testing Pre-Inspection Upload

### Step 1: Open Vehicle Detail Page
1. Go to Admin → B2B Booking → Vehicles
2. Click "View" on any vehicle
3. Page should load successfully

### Step 2: Add Images/Videos
1. Scroll to **"Pre-Inspection"** section
2. Click file input to select images
3. Select 1-2 test images
4. Click "Save Pre-Inspection"

### Step 3: Check Console Logs (F12)
Open browser console and look for these logs in order:

```
✓ "Starting pre-inspection save..."
✓ "Vehicle ID: abc123xyz"
✓ "Images to upload: 2"
✓ "Videos to upload: 0"
✓ "Uploading image 1/2: photo.jpg"
✓ "Upload path: b2b-pre-inspections/abc123xyz/images/photo.jpg-1703686234567"
✓ "Bytes uploaded, getting download URL..."
✓ "Download URL obtained: https://firebasestorage.googleapis.com/..."
✓ "All files uploaded, updating Firestore..."
✓ "Firestore updated successfully"
✓ "Pre-inspection saved successfully"
```

---

## If You See an Error

### Error: "Missing or insufficient permissions"

**Console will show:**
```
Failed to upload image photo.jpg: FirebaseError: Storage: Missing or insufficient permissions
```

**Solutions:**
1. Check Firebase Storage rules are deployed:
   ```bash
   firebase deploy --only storage
   ```

2. Verify rules in Firebase Console:
   - Go to Storage → Rules
   - Should see `b2b-pre-inspections/{vehicleId}/{allPaths=**}`

3. Hard refresh browser:
   - Windows: `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

### Error: "Firebase: Auth error"

**Console will show:**
```
Failed to upload image: FirebaseError: Firebase: You don't have permission...
```

**Solution:**
- Make sure you're logged in as admin
- Check user role in Firestore → users collection

### Error: "Path not found" or similar

**Console will show the exact upload path:**
```
Upload path: b2b-pre-inspections/abc123/images/photo.jpg-1234567890
```

This helps identify if path is correct.

---

## Data Flow Diagram

```
User clicks "Save Pre-Inspection"
    ↓
Validate vehicle ID
    ↓
Loop through each image file
    ├─ Create storage path
    ├─ Upload bytes to Storage
    ├─ Get download URL
    └─ Add URL to array
    ↓
Loop through each video file
    ├─ Create storage path
    ├─ Upload bytes to Storage
    ├─ Get download URL
    └─ Add URL to array
    ↓
Update Firestore with URLs & message
    ↓
Show success message
```

---

## Storage Rules Being Used

Your Firebase Storage rules:

```firestore
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // B2B Pre-Inspections - Allow all authenticated users
    match /b2b-pre-inspections/{vehicleId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Public read, authenticated write for everything else
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

✅ Allows any authenticated user to write to `b2b-pre-inspections/*`
✅ Allows anyone to read files
✅ Uses `{allPaths=**}` wildcard for nested paths

---

## What the Code Does Now

### Before Upload:
- ✅ Validates vehicle ID exists
- ✅ Clears previous status messages
- ✅ Sets "Saving..." button state

### During Upload:
- ✅ Logs vehicle ID
- ✅ Logs file count
- ✅ Logs each file being uploaded
- ✅ Logs exact storage path
- ✅ Logs when bytes uploaded
- ✅ Logs when download URL obtained
- ✅ Catches per-file errors with details

### After Upload Success:
- ✅ Logs "All files uploaded"
- ✅ Updates Firestore with URLs
- ✅ Updates local state
- ✅ Clears file inputs
- ✅ Shows success message for 3 seconds
- ✅ Logs final success

### On Error:
- ✅ Catches specific error for each file
- ✅ Shows file name that failed
- ✅ Shows error type/message
- ✅ Displays error to user
- ✅ Logs full error to console
- ✅ Still allows retry

---

## Testing Checklist

- [ ] Vehicle detail page loads
- [ ] No errors in console on page load
- [ ] Can select image file
- [ ] Image preview shows
- [ ] Can click "Save Pre-Inspection"
- [ ] Console shows upload logs
- [ ] Success message appears (green box)
- [ ] Message says "Pre-inspection saved successfully!"
- [ ] Files removed from preview
- [ ] Can refresh page and see saved images

---

## If Upload Still Fails

1. **Check auth:**
   ```javascript
   import { getAuth } from 'firebase/auth';
   const auth = getAuth();
   console.log('Auth:', auth.currentUser?.uid);
   console.log('User email:', auth.currentUser?.email);
   ```

2. **Check storage metrics:**
   - Firebase Console → Storage → Metrics
   - Look for denied uploads
   - See reason for denial

3. **Verify rules deployed:**
   ```bash
   firebase deploy --only storage
   ```

4. **Check file size:**
   - Images should be < 10MB
   - Videos should be < 100MB
   - Files are being validated before upload

---

## Console Commands for Testing

```javascript
// Check if Storage initialized
import { getStorage, ref } from 'firebase/storage';
const storage = getStorage();
console.log('Storage:', storage);

// Check current auth user
import { getAuth } from 'firebase/auth';
const auth = getAuth();
console.log('Current user:', auth.currentUser);

// Check if path is correct
const vehicleId = 'test-vehicle-id';
const testPath = `b2b-pre-inspections/${vehicleId}/images/test.jpg`;
console.log('Test path:', testPath);
```

---

## Summary

The code now provides:
1. **Detailed logging** - See exactly what's happening at each step
2. **Specific error messages** - Know which file failed and why
3. **Better UI feedback** - Errors and success are clearly visible
4. **Console hints** - Messages tell users to check F12 console
5. **Per-file tracking** - Shows progress uploading multiple files

Just open the console (F12) and watch the logs as you upload! 🚀


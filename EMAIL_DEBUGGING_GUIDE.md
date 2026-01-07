# 🔧 Email Debugging & Troubleshooting Guide

**Last Updated:** January 2026  
**Status:** Email fixes applied

---

## 📋 Issues Fixed

### ✅ Issue 1: Hardcoded Email in Logs
**File:** `app/api/send-email/route.ts`
- **Problem:** Console logs were showing hardcoded email `rahuldxbfb@gmail.com` instead of actual customer email
- **Fix:** Updated logs to show actual recipient email and Resend API response ID
- **Impact:** Can now properly track which email addresses are receiving messages

### ✅ Issue 2: No Error Details on Email Failure
**File:** `app/api/send-email/route.ts`
- **Problem:** Errors from Resend API weren't being logged with details
- **Fix:** Added comprehensive error logging with error message, error type, and stack trace
- **Impact:** Can now identify why emails aren't sending (missing API key, invalid email, etc.)

### ✅ Issue 3: No Email Response Validation in Booking
**File:** `app/admin/book-service/page.tsx`
- **Problem:** Email fetch was not checking if response was successful
- **Fix:** Added response validation and proper logging of email result
- **Impact:** Can see if email sending failed and get error details

### ✅ Issue 4: No Email Sent from Leads Module
**File:** `app/admin/leads/[id]/page.tsx`
- **Problem:** When booking created from leads, no confirmation email was sent
- **Fix:** Added complete email sending logic after booking creation (mirror of book-service)
- **Impact:** Customers now receive confirmation email whether booking from book-service or leads module

---

## 🔍 How to Debug Email Issues

### Step 1: Check Browser Console
When creating a booking, open the browser's developer console (F12) and look for these logs:

**✅ SUCCESS LOGS (Green):**
```
📧 Sending booking confirmation email to: customer@example.com
✅ Booking email sent successfully: {to: "customer@example.com", resendId: "..."}
```

**⚠️ WARNING LOGS (Yellow):**
```
⚠️ No customer email provided for booking confirmation
⚠️ Email sending warning: Invalid email format
```

**❌ ERROR LOGS (Red):**
```
❌ Booking confirmation email error: Error: RESEND_API_KEY is not set
```

### Step 2: Check Server Console/Logs
The backend sends detailed logs to your server console:

**✅ SUCCESS:**
```
📧 Email API Called: {
  emailType: 'booking-confirmation',
  email: 'customer@example.com',
  name: 'John Doe',
  timestamp: '2026-01-06T10:30:00Z'
}

✅ Email sent successfully: {
  email: 'customer@example.com',
  emailType: 'booking-confirmation',
  resendId: 'email_1234567890',
  timestamp: '2026-01-06T10:30:01Z'
}
```

**❌ ERRORS:**
```
❌ Email API Error: {
  message: 'RESEND_API_KEY is not set',
  error: 'Missing API key',
  timestamp: '2026-01-06T10:30:00Z'
}
```

---

## 🛠️ Common Issues & Solutions

### Issue: "RESEND_API_KEY is not set"

**Cause:** Environment variable not configured

**Solution:**
```bash
# 1. Check if .env.local exists
cat .env.local

# 2. Add the key if missing
echo "RESEND_API_KEY=re_xxxxxxxxxxxxx" >> .env.local

# 3. Get valid API key from https://resend.com
# - Log in to your account
# - Go to API Keys
# - Copy your Production API key
# - Replace re_xxxxxxxxxxxxx with actual key

# 4. Restart the dev server
npm run dev
```

**Verification:**
```javascript
// In browser console after restart:
// The email should have a valid resendId in success response
```

---

### Issue: "Invalid email address"

**Cause:** Customer email is invalid or empty

**Check:**
1. Open admin/book-service page
2. Look at the email field - does it have a value?
3. Is the email format valid (abc@example.com)?

**Solution:**
- Enter a valid email address in the booking form
- Example: `customer@gmail.com`

**Debug in form:**
```javascript
// In browser console while filling form:
const email = document.querySelector('input[type="email"]').value;
console.log('Email:', email); // Should show valid email
```

---

### Issue: "Email sending failed - Unknown error"

**Cause:** Something went wrong in the API

**Solution:**
1. Check server console for full error message
2. Look for error details in API response:
   ```
   POST /api/send-email
   Status: 500 (or error status)
   Response: { error: "..." }
   ```

3. Common causes:
   - Invalid API key (key expired or wrong)
   - Email service is down
   - Invalid email format
   - Request timeout

**Fix:**
- Verify RESEND_API_KEY is correct
- Try sending again (might be temporary issue)
- Check https://status.resend.com for service status

---

### Issue: Email not arriving in inbox

**Cause:** Several possibilities

**Verification Steps:**
1. Check browser console - was email marked as "sent successfully"?
2. Check server logs - do you see `✅ Email sent successfully`?
3. Check spam/junk folder in email account
4. Wait 5-10 minutes (email delivery can be delayed)

**If successful in logs but not in inbox:**
- Check spam folder
- Add `info@rahuldxb.com` to contacts
- Request whitelist from your email provider
- Try with different email account

---

## ✅ Testing Emails

### Full End-to-End Test

#### Test 1: Booking from Book-Service Module
```
1. Go to Admin → Book Service
2. Fill out form:
   - Name: John Test
   - Email: YOUR_EMAIL@gmail.com ✓ Use YOUR email
   - Phone: 0501234567
   - Service: Car Wash
   - Date: Tomorrow
   - Time: 10:00 AM
   - Vehicle: Any brand/model
3. Click Submit
4. Check:
   - Browser console: Should show ✅ Email sent
   - Server logs: Should show email success
   - YOUR email inbox: Should have confirmation (in 30 seconds)
```

#### Test 2: Booking from Leads Module
```
1. Go to Admin → Leads
2. Click on any lead
3. Click "Book Service"
4. Fill out booking form (same as above)
5. Click Submit/Book
6. Check:
   - Browser console: Should show ✅ Email sent
   - Lead's email address: Should receive confirmation
```

#### Test 3: Verify Email Content
When you receive the confirmation email, verify:
- ✓ From: Car Mantra <info@rahuldxb.com>
- ✓ Subject: Service Booking Confirmed - Job Card #...
- ✓ Contains: Your name, job card number, service type
- ✓ Contains: Scheduled date and time
- ✓ Contains: Vehicle details (brand, model, plate)
- ✓ Contains: Professional design with orange theme
- ✓ Layout: Responsive (check on mobile)

---

## 📊 Debugging Checklist

### Before Testing
- [ ] RESEND_API_KEY is set in .env.local
- [ ] API key is valid and active
- [ ] npm run dev is running
- [ ] No errors in terminal

### During Booking
- [ ] Customer email is valid
- [ ] All required fields are filled
- [ ] Submit button was clicked
- [ ] Page didn't show error message

### After Booking
- [ ] Browser console shows "✅ Email sent successfully"
- [ ] Server logs show email success
- [ ] Email arrives within 30 seconds
- [ ] Email content is correct

### If Not Working
- [ ] Check browser console for errors
- [ ] Check server console for detailed error
- [ ] Check RESEND_API_KEY is valid
- [ ] Check internet connection
- [ ] Check spam folder
- [ ] Try with different email address
- [ ] Restart dev server

---

## 🔗 Key Files

### Email API
**File:** `app/api/send-email/route.ts`
- Entry point for all email sending
- Handles three email types: booking, quotation, invoice
- Returns: `{ success: true/false, error?: string, id?: string }`

### Booking Form (Book-Service)
**File:** `app/admin/book-service/page.tsx`
- Line 372-405: Email sending code
- Sends `emailType: 'booking-confirmation'`
- Logs to console with detailed info

### Booking from Lead
**File:** `app/admin/leads/[id]/page.tsx`
- Line ~400: Email sending code
- Same email logic as book-service
- Sends after updating lead status

### Email Templates
- `components/emails/BookingConfirmationEmail.tsx` - Orange theme
- `components/emails/QuotationEmail.tsx` - Blue theme
- `components/emails/InvoiceEmail.tsx` - Green theme

---

## 🧪 Console Logs Reference

### Email API Logs (Server-side)

```
📧 Email API Called
├─ emailType: 'booking-confirmation'
├─ email: 'customer@example.com'
├─ name: 'John Doe'
└─ timestamp: '2026-01-06T...'

📧 Sending booking confirmation to: customer@example.com

📤 Sending email via Resend API...

📧 Email payload:
├─ to: 'customer@example.com'
├─ subject: 'Service Booking Confirmed - Job Card #J123456'
├─ from: 'Car Mantra <info@rahuldxb.com>'
├─ hasAttachment: false
└─ attachmentCount: 0

✅ Email sent successfully:
├─ email: 'customer@example.com'
├─ emailType: 'booking-confirmation'
├─ resendId: 'email_xxxxxxxxxxxx'
└─ timestamp: '2026-01-06T...'
```

### Client-side Logs (Browser Console)

```
📧 Sending booking confirmation email to: customer@example.com

✅ Booking email sent successfully: {
  to: "customer@example.com",
  resendId: "email_xxxxxxxxxxxx"
}
```

---

## 🆘 Still Not Working?

### Troubleshooting Steps

1. **Verify API Key:**
   ```bash
   echo $env:RESEND_API_KEY  # Windows PowerShell
   echo $RESEND_API_KEY       # Mac/Linux
   ```
   Should output: `re_xxxxxxxxxxxxx` (not empty)

2. **Check Email Format:**
   ```javascript
   // In console
   const email = 'test@gmail.com';
   const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
   console.log('Email valid:', isValid); // Should be true
   ```

3. **Test API Directly:**
   ```javascript
   // In console
   fetch('/api/send-email', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       emailType: 'booking-confirmation',
       name: 'Test User',
       email: 'your-email@gmail.com',
       phone: '1234567890',
       service: 'Test',
       jobCardNo: 'TEST123',
       scheduledDate: new Date().toISOString(),
       vehicleDetails: {
         vehicleBrand: 'Toyota',
         modelName: 'Corolla',
         numberPlate: 'ABC123'
       }
     })
   })
   .then(r => r.json())
   .then(d => console.log('Result:', d))
   ```

4. **Check Resend Status:**
   - Visit: https://status.resend.com
   - Verify: All services should be "Operational"

5. **Review Email Logs:**
   - Check: https://resend.com (Dashboard → Emails)
   - Look for: Your email address in recent sends
   - Verify: Status shows "Delivered" or "Opened"

---

## 📞 Support

### For API Key Issues
- Visit: https://resend.com
- Login to your account
- Go to: API Keys section
- Verify: Key is active and not expired

### For Template Issues
- Files: `components/emails/*.tsx`
- Check: All imports are correct
- Verify: react-email components are installed

### For Booking Issues
- Files: `app/admin/book-service/page.tsx` or `app/admin/leads/[id]/page.tsx`
- Check: Customer email is provided
- Verify: Email validation passes

---

## 📝 Debugging Script

Save this as a quick reference in your browser console:

```javascript
// Quick Email Test Script
async function testEmail(email) {
  console.log('📧 Testing email send to:', email);
  
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailType: 'booking-confirmation',
      name: 'Test Customer',
      email: email,
      phone: '+971500000000',
      service: 'Test Service',
      jobCardNo: 'TEST' + Date.now(),
      scheduledDate: new Date(Date.now() + 86400000).toISOString(),
      vehicleDetails: {
        vehicleBrand: 'Toyota',
        modelName: 'Corolla',
        numberPlate: 'TEST-001'
      }
    })
  });
  
  const result = await response.json();
  
  console.log('✅ Response:', result);
  console.log('Status:', response.ok ? 'Success' : 'Failed');
  
  return result;
}

// Usage:
// testEmail('your-email@gmail.com')
```

---

**Last Verified:** January 2026  
**All systems ready for testing!** ✅

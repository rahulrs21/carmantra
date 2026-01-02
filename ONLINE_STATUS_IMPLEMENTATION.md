# Online/Offline Status Tracking Implementation

## Overview
Implemented a comprehensive system to track user online/offline status when users access the admin dashboard and logout.

## Changes Made

### 1. **New Hook: `useOnlineStatus()`** 
**File:** `hooks/useOnlineStatus.ts`

This custom hook manages the user's online/offline status globally:
- **On Login:** Marks user as `isOnline: true` with `lastLogin` timestamp
- **Heartbeat:** Every 30 seconds, updates `lastActivityAt` to keep user marked as online
- **On Logout:** Marks user as `isOnline: false`
- **Error Handling:** Gracefully handles missing user documents

```typescript
export function useOnlineStatus() {
  // Tracks authentication state and maintains online/offline status
  // Automatically cleans up on logout
}
```

### 2. **Admin Layout Integration**
**File:** `app/admin/layout.tsx`

Integrated the hook into the admin layout so it runs for ALL admin pages:
```typescript
function AdminLayoutContent({ children }) {
  useOnlineStatus();  // Tracks online status globally
  // ...
}
```

**Benefits:**
- Single source of truth for online status tracking
- Applies to entire admin dashboard (all child routes)
- Automatically starts when user enters admin area
- Automatically cleans up on logout

### 3. **Logout Handlers Updated**

#### AdminLogout Component (`components/AdminLogout.tsx`)
- Explicitly marks user as offline before signing out
- Ensures offline status is recorded before auth state changes

#### AdminShell Component (`components/AdminShell.tsx`)
- Updated `handleLogout()` to mark user as offline
- Handles logout from the main navigation menu

### 4. **Removed Duplicate Code**
**File:** `app/admin/users/page.tsx`

Removed the duplicate online status tracking logic that was previously in this component since the hook now handles it globally.

## How It Works

### Login Flow
1. User logs in to admin dashboard
2. `useOnlineStatus()` hook in admin layout detects auth state change
3. User document in Firestore updated: `isOnline: true`, `lastLogin: <timestamp>`
4. Heartbeat interval starts (every 30 seconds)

### Active Session
- Every 30 seconds, `lastActivityAt` is updated to current timestamp
- This keeps the user marked as online while they're actively using the dashboard

### Logout Flow
1. User clicks logout button
2. Logout handler marks user as offline: `isOnline: false`
3. Auth state changes
4. Cleanup function runs: clears heartbeat interval
5. User is redirected to login page

## Firestore Fields Used

- `isOnline` (boolean): Whether user is currently online
- `lastLogin` (Timestamp): When user last logged in
- `lastActivityAt` (Timestamp): Last time user was active (updated every 30 seconds)

## Benefits of This Approach

✅ **Global Implementation:** Works across all admin pages without duplication
✅ **Clean Lifecycle:** Automatically tracks login/logout events
✅ **Efficient:** 30-second heartbeat prevents excessive Firestore writes
✅ **Resilient:** Gracefully handles missing documents and network errors
✅ **Maintainable:** Centralized in one hook and layout component
✅ **User Status Visibility:** Enables real-time online/offline status display in admin dashboard (e.g., the green dot indicator in user list)

## Testing the Feature

1. **Login:** Visit `/admin/dashboard` - user should be marked `isOnline: true`
2. **Verify Heartbeat:** Check Firestore after ~30 seconds - `lastActivityAt` should be updated
3. **Stay Active:** Keep dashboard open - heartbeat continues updating
4. **Logout:** Click logout button - user marked `isOnline: false` before redirect
5. **View Status:** In Users management page, online status is shown with a green pulse dot

## Files Modified
- ✅ `hooks/useOnlineStatus.ts` (NEW)
- ✅ `app/admin/layout.tsx`
- ✅ `components/AdminLogout.tsx`
- ✅ `components/AdminShell.tsx`
- ✅ `app/admin/users/page.tsx`

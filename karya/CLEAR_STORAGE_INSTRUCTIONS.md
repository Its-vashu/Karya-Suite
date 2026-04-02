# Clear App Storage for Testing Login Flow

## Why Clear Storage?
During development, authentication tokens are stored in AsyncStorage. To test the fresh install login flow, you need to clear this storage.

## Methods to Clear Storage

### Method 1: Using Settings Screen (Easiest)
1. Open the app
2. Go to Profile → Settings
3. Tap "Log out" button
4. This will clear all auth tokens and redirect to login

### Method 2: React Native Debugger Console
1. Open Chrome DevTools (Cmd+M or Ctrl+M → Debug)
2. In console, run:
```javascript
AsyncStorage.clear().then(() => console.log('Storage cleared'));
```
3. Reload the app

### Method 3: Uninstall & Reinstall App
1. Uninstall the app from device/emulator
2. Reinstall using:
```bash
cd karya
npx react-native run-android
# or
npx react-native run-ios
```

### Method 4: Clear Data via Android Device Settings
1. Settings → Apps → Karya
2. Storage → Clear Data
3. Restart the app

## Testing Production APK Login Flow

### Build Release APK
```bash
cd karya/android
./gradlew assembleRelease
```

### Install APK on Physical Device
```bash
adb install app/build/outputs/apk/release/app-release.apk
```

### Expected Behavior:
1. **First Install**: Login screen shows immediately ✅
2. **After Login**: User sees Home screen ✅
3. **Close & Reopen App**: User automatically logged in (no login screen) ✅
4. **After Logout**: Login screen shows ✅
5. **Fresh Install**: Login screen shows ✅

## How Authentication Works Now

### Flow Diagram:
```
App Start
    ↓
Check AsyncStorage for authToken & userData
    ↓
    ├── Both Found? → Auto Login → Home Screen
    │
    └── Not Found? → Show Login Screen
                        ↓
                    User Logs In
                        ↓
                Save Token & User Data to AsyncStorage
                        ↓
                    Navigate to Home Screen
                        ↓
                    (Future app opens: Auto Login)
```

### Storage Keys Used:
- `authToken` - JWT token for API calls
- `userData` - User profile information
- `user` - Legacy key (for compatibility)

### Auto-Login Conditions:
App will auto-login ONLY if:
1. `authToken` exists in storage ✓
2. `userData` exists in storage ✓
3. User data has valid structure (id/username) ✓
4. Session hasn't expired (30 min timeout) ✓

## Troubleshooting

### Issue: App always shows Home screen (never Login)
**Solution**: Clear AsyncStorage using Method 1 or 2 above

### Issue: App always shows Login screen (doesn't remember login)
**Possible Causes**:
1. Login function not saving token properly
2. AsyncStorage permissions issue
3. Check console for errors

### Issue: Session expires too quickly
**Solution**: Adjust `SESSION_TIMEOUT` in `AuthContext.js` (currently 30 minutes)

## Production Checklist Before Play Store Upload

- [ ] Test fresh install → Login screen shows
- [ ] Test login → Credentials work
- [ ] Test auto-login → Close & reopen app stays logged in
- [ ] Test logout → Returns to login screen
- [ ] Test session timeout → Expires after 30 minutes of inactivity
- [ ] Test offline mode → Shows appropriate error message
- [ ] Remove any console.log statements with sensitive data
- [ ] Verify API endpoints point to production server (not localhost)
- [ ] Test on physical Android device (not just emulator)
- [ ] Build signed release APK with proper keystore
- [ ] Verify app version number is correct in package.json

## Updated Files for Authentication Fix

1. **AuthContext.js** - Enhanced checkStoredAuth() to require both token AND user data
2. **App.jsx** - Properly calls isAuthenticated() function
3. **Loginpage.jsx** - Uses navigation.reset() instead of navigate() to prevent back button issues

These changes ensure production-ready authentication flow! 🚀

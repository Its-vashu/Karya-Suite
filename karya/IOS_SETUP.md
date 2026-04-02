iOS Setup Notes (Info.plist & CocoaPods)

Purpose
- Quick checklist and commands to prepare the `karya` app for iOS (simulator / device).
- Covers required Info.plist keys, CocoaPods steps, and common package-specific notes (Reanimated, Vector Icons, Permissions).

Prerequisites (macOS)
- Xcode (latest stable) installed.
- CocoaPods installed: `sudo gem install cocoapods` (or use Homebrew). Verify with `pod --version`.
- If using Expo managed workflow, you'll need a mac to run `expo prebuild` and `pod install` for a standalone iOS build.

1) Info.plist keys (required)
Add the following keys into `ios/YourApp/Info.plist` (or configure via Expo config plugins). Put brief user-facing messages.

<key>NSLocationWhenInUseUsageDescription</key>
<string>We use your location to show local weather and nearby office info.</string>

<key>NSCameraUsageDescription</key>
<string>Camera access is required to capture ID documents or photos for verification.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Access to Photos is required to pick or save documents to your photo library.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Permission to save generated PDFs to your library.</string>

Notes:
- Only include keys your app actually uses. Apple will reject apps that request unnecessary permissions without justification.
- For Expo managed apps, add these keys to `app.json` / `app.config.js` under ios.infoPlist or use the appropriate config plugin.

2) CocoaPods (install native dependencies)
From the project root (after `npx react-native init` or `expo prebuild` when using Expo):

```bash
cd ios
pod install
cd ..
```

Alternative (convenience):
```bash
npx pod-install
```

If `pod install` fails, run `pod repo update` then retry.

3) Package-specific notes
- react-native-reanimated (v2+)
  - Add Reanimated plugin to `babel.config.js`:

```js
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```
  - Rebuild the iOS project after installing (pod install + clean build in Xcode).

- react-native-vector-icons
  - For bare React Native: ensure fonts are linked (auto-link on RN >=0.60). Run `pod install`.
  - For Expo: vector icons come pre-bundled but in a bare app run `pod install`.

- react-native-gesture-handler
  - Follow installation steps (wrap app root with GestureHandlerRootView or register in index.js) and run `pod install`.

- react-native-permissions
  - Add Info.plist keys for the permissions you request (location, camera) and follow pod install.

4) Expo-specific notes
- Managed workflow (Expo Go): many native modules won't work unless available in Expo Go; for custom native modules (e.g., Reanimated native), use the prebuild workflow or EAS Build.
- To prepare native iOS files from an Expo managed project:

```bash
expo prebuild --platform ios
cd ios
pod install
```

5) Run on iOS simulator
- From macOS project root:

```bash
# For bare RN
npx react-native run-ios

# Or open ios/YourApp.xcworkspace in Xcode and run from Xcode
```

6) Troubleshooting
- "Missing Info.plist key" errors: add the requested key and rebuild.
- Reanimated build errors: ensure plugin in `babel.config.js` is last in the plugins array and React Native restart / pod install performed.
- Pod install errors: run `arch -x86_64 pod install` on Apple Silicon if you hit native gem issues (or install ffi and re-run).

7) Quick checklist before submitting to App Store
- Remove unused permission keys.
- Test on device for each permission flow.
- Update App Store privacy descriptions to match Info.plist messages.
- Increment version/build number in Xcode.

If you want, I can:
- Create an `ios/InfoPlist.patch` snippet you can apply to the existing Info.plist.
- Add an Expo `app.json` example showing how to set `ios.infoPlist` keys.
- Run a repo scan and point out which native modules in `package.json` need manual iOS steps.

---
Generated on: 2025-09-11

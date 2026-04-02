// app.config.js
export default {
  name: 'karya',
  slug: 'karya',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  
  icon: './assets/images/icon.png',

  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1976D2'
  },

  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.concientech.karya'
  },
  android: {
    package: 'com.concientech.karya',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/icon.png', 
      backgroundColor: '#ffffff'
    },
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'INTERNET'
    ]
  },
  extra: {
    eas: {
      projectId: 'f747dbb6-dfc2-42f2-97c2-f009fa12ad82'
    }
  }
};
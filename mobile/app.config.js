const brand = require('./src/config/brand.json');
const dataSource = process.env.EXPO_PUBLIC_DATA_SOURCE || 'api';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';

// The Expo config reads the same white-label source used by the runtime app.
module.exports = {
  expo: {
    name: brand.appName,
    slug: brand.slug,
    version: '1.0.0',
    orientation: 'portrait',
    icon: brand.assets.icon,
    userInterfaceStyle: 'light',
    splash: {
      image: brand.assets.splash,
      resizeMode: 'contain',
      backgroundColor: brand.palette.background,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: brand.bundleIdentifiers.ios,
    },
    android: {
      package: brand.bundleIdentifiers.android,
      adaptiveIcon: {
        foregroundImage: brand.assets.adaptiveIcon,
        backgroundColor: brand.palette.surface,
      },
    },
    web: {
      favicon: brand.assets.favicon,
    },
    extra: {
      brandSlug: brand.slug,
      dataSource,
      apiBaseUrl,
    },
  },
};

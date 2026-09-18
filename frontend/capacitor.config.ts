import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neuralwave.munshiji',
  appName: 'MunshiJi',
  webDir: 'dist',
  server: {
    // The APK is a thin wrapper: the WebView loads the deployed app, so every release of the
    // site is a release of the app. After changing this: npx cap sync android, then rebuild.
    url: 'https://paytm-nu-seven.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;

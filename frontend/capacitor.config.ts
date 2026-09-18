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
  // Explicit plugin list: the repo's rule keeps runtime dependencies to react + react-dom, so
  // Capacitor packages live in devDependencies — this tells `cap sync` to ship them natively
  // anyway. The web bundle never imports the plugin; it reaches it via window.Capacitor.
  includePlugins: [
    '@capacitor-community/speech-recognition',
    '@capacitor-community/text-to-speech',
  ],
};

export default config;

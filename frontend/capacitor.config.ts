import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neuralwave.munshiji',
  appName: 'MunshiJi',
  webDir: 'dist',
  server: {
    // ============================================================
    // !!! PLACEHOLDER — REPLACE WITH THE REAL VERCEL URL !!!
    // !!! The APK loads THIS url as the entire app.       !!!
    // !!! After changing it: npx cap sync android, rebuild.!!!
    // ============================================================
    url: 'https://PLACEHOLDER-VERCEL-URL.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;

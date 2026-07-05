import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fitnessapp',
  appName: 'TT',
  webDir: 'dist',
  ios: {
    // Respect the notch / home indicator safe areas
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
}

export default config

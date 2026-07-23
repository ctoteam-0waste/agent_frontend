# Mappls licence files

The Android APK build fails without the Mappls SDK licence files. Place them in this folder:

- `<name>.a.olf` — licence file
- `<name>.a.conf` — config file (same base name as the .olf)

## How to get them

1. Log in at https://apps.mappls.com (the account that owns the map SDK keys)
2. Go to the app/credentials section for the Android SDK
3. Register the Android app with package name: `com.karmaverse.agent`
4. Download the generated `.a.olf` and `.a.conf` files
5. Drop both files in this folder and rebuild (`npx eas-cli build -p android --profile preview`)

The Expo config plugin (`plugins/withMapplsMaven.js`) copies them into `android/app/` automatically during prebuild.

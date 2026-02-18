# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Running on your phone (Expo Go)

- **Install Expo Go** on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)).
- Run `npm start` (uses **tunnel** by default so it works across networks).
- **Scan the QR code with the Expo Go app** (Expo Go’s built-in scanner), not with your normal camera or browser.

### If scanning the QR code doesn’t connect

1. **Tunnel is slow or fails**  
   Use LAN instead (phone and PC must be on the **same Wi‑Fi**):
   ```bash
   npm run start:lan
   ```
   Then scan the new QR code with Expo Go.

2. **Windows Firewall**  
   If you use LAN and the phone still can’t connect, allow Node/Metro through Windows Firewall:
   - Windows Security → Firewall & network protection → Allow an app through firewall.
   - Find **Node.js** and allow it on **Private** (and **Public** if you need it).
   - Or allow **inbound TCP** for ports **8081** and **19000–19002**.

3. **Same Wi‑Fi**  
   For LAN, the phone and the computer must be on the same Wi‑Fi. Avoid guest networks.

4. **Scan with Expo Go**  
   Open the **Expo Go** app → “Scan QR code” and point it at the QR in the terminal. Don’t use the device’s default camera app.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

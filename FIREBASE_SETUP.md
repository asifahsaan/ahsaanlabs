# Firebase setup (one time, free Spark plan, about 10 minutes)

Login and statistics need a free Firebase project. Until `labs-auth.js` has your config, the labs stay open and nothing is recorded.

1. Go to https://console.firebase.google.com and click **Add project**. Name it `ahsaanlabs`. You can turn Google Analytics off.
2. **Build > Authentication > Get started > Sign-in method > Google > Enable**. Choose your support email and save.
3. **Authentication > Settings > Authorized domains > Add domain**: `asifahsaan.github.io`.
4. **Build > Firestore Database > Create database**. Choose a location near Pakistan (for example `asia-south1`), start in **production mode**.
5. **Firestore > Rules**: paste the contents of `firestore.rules` from this repo. Replace `REPLACE_WITH_ADMIN_EMAIL@gmail.com` with the admin Google account, then **Publish**.
6. **Project settings (gear) > General > Your apps > Web (`</>`)**: register an app named `ahsaanlabs`. Copy the `firebaseConfig` values (`apiKey`, `authDomain`, `projectId`, `appId`).
7. In `labs-auth.js`, paste them into `CFG.firebase` and put the same admin email in `CFG.admins`. Commit and push.
8. Open `https://asifahsaan.github.io/ahsaanlabs/admin.html` and sign in with the admin account to see the statistics.

The Firebase web config is meant to be public. Access is protected by the Firestore rules, so keep the rules published.

Free-plan limits (Spark): 50,000 reads and 20,000 writes per day, which is plenty for classes.

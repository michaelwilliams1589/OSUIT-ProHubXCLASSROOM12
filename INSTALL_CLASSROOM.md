# Install Pro Hub X Classroom 9.0

1. Open your existing Pro Hub X Classroom GitHub repository.
2. Replace the repository files with the contents of this folder.
3. Confirm `firebase-config.js` contains your existing Firebase configuration.
4. Open Firebase Console → Realtime Database → Rules.
5. Paste the included `firebase-rules.json` and click Publish.
6. Confirm the Classroom GitHub Pages domain is listed under Firebase Authentication → Authorized domains.
7. Wait for GitHub Pages to deploy, then refresh the site twice.

If the old weather error remains, clear the stored site data for the GitHub Pages site once and reopen it.
Your Firebase accounts and classroom data remain in Firebase.

9. Open GitHub → Actions → Update Weather Data → Run workflow once.

10. Open the deployed site and use the floating **System Health** button to verify the deployment.

Use GITHUB_DESKTOP_DEPLOYMENT.md and click Setup after deployment.

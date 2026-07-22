# Deployment Checklist — Version 6.5

1. Back up the current GitHub repository.
2. Replace the deployed files with the contents of this folder.
3. In Firebase Realtime Database, replace the Rules with `firebase-rules.json` and click **Publish**.
4. Confirm Firebase Authentication providers remain enabled.
5. Wait for GitHub Pages Actions to finish successfully.
6. Open DevTools → Application → Storage → Clear site data.
7. Open Application → Service Workers → Unregister the prior worker.
8. Reload with Ctrl+Shift+R.
9. Confirm Home displays **PRO HUB X 6.5**.
10. Test administrator, instructor, and student accounts separately.

# GitHub Desktop Deployment

Use GitHub Desktop so the hidden `.github` workflow folder is included.

1. Extract this ZIP.
2. Open GitHub Desktop.
3. Clone your existing Pro Hub repository.
4. Open the cloned repository folder.
5. Replace its contents with this package, but keep the hidden `.git` folder.
6. Return to GitHub Desktop, commit all changes, and push.
7. On GitHub, confirm `.github/workflows/update-weather.yml` exists.
8. Open Actions → Update Weather Data → Run workflow once.
9. Wait for Pages to redeploy.
10. Open Pro Hub and click Setup.

Manual fallback: create `.github/workflows/update-weather.yml` in GitHub and paste the contents of `UPDATE_WEATHER_WORKFLOW_COPY.yml`.

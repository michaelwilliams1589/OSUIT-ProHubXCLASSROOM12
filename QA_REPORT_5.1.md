# Pro Hub X 5.1 QA Report

## Corrected
- Workspace owner role now self-recovers to Administrator when an older build lost the role record.
- Personal onboarding no longer overwrites the workspace owner as Student.
- Live weather is rendered directly on the Home dashboard using Open-Meteo.
- Favorite-team score/schedule cards load from ESPN public web feeds, with graceful fallback when a feed is unavailable.
- Custom background pictures can be uploaded, compressed, saved to the user's profile, removed, and shown on the Home hero.
- Service-worker cache advanced to 5.1.0.
- Firebase rules include the ownerEmail setup field.

## Static checks
- app.js passed `node --check`.
- firebase-rules.json parsed successfully.
- manifest.json parsed successfully.
- Live endpoint smoke checks could not run in the local container because outbound DNS was unavailable. The integration code and failure handling were still reviewed statically.

## Important limitation
ESPN's score endpoints are public web feeds but are not a supported contractual API. The app handles failures and displays an unavailable message instead of breaking the dashboard.

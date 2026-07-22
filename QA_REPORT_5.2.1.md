# Pro Hub X Classroom 5.2.1 QA Report

## Checks completed

- JavaScript syntax validated with Node.js.
- Firebase rules and manifest JSON validated.
- Service worker syntax and cache version checked.
- GitHub Pages relative file paths checked.
- Administrator bootstrap and owner-role recovery reviewed.
- Student/faculty onboarding and faculty approval flow reviewed.
- Course creation, join codes, enrollment, announcements, chat, and archiving reviewed.
- Personal weather, sports, themes, widgets, custom links, notes, tasks, calendar, and uploaded backgrounds reviewed.
- Department library publishing and template import reviewed.

## Bugs corrected

1. Instructor accounts could not see the Department Library even though instructors are supposed to publish and import resources.
2. Administrators did not have a Chat navigation item.
3. The personal onboarding progress indicator used the administrator wizard step and could display the wrong page count.
4. Course join codes were generated without checking for an existing code.
5. A partially failed course creation could leave membership, user-course, or join-code records behind.
6. Archived courses kept an active join code, allowing new enrollment after archiving.
7. Any instructor could overwrite or delete another instructor's marketplace resource through a direct database request.
8. Any instructor could overwrite another instructor's join-code record through a direct database request.
9. A faculty applicant could edit the status of their own approval request. Applicants can now only create a new pending request; only an administrator can approve or deny it.
10. The browser title and service-worker cache still showed an older build number.

## Live-service limitation

A complete end-to-end test still requires deployment because Firebase Authentication, Realtime Database permissions, Open-Meteo, ESPN score feeds, and the QR image service require live internet access. Use the included Firebase rules with this build.

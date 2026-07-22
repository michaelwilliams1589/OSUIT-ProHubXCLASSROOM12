# QA Report — Version 7.1

## Static checks completed
- JavaScript syntax: passed
- Service worker syntax: passed
- Firebase rules JSON: passed
- Manifest JSON: passed
- ZIP integrity: passed
- Role-gated navigation reviewed
- Faculty and leadership database paths reviewed

## Live checks still required
Test with separate student, instructor, and leadership accounts against the deployed Firebase project. Confirm that student reads to `facultyChats` and `leadershipChats` return permission denied.

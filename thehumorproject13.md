Test plan and updates summary

01 Voting App

Tested:
Vercel deployment (normal + Incognito)
Supabase data loading (captions, images)
Authentication (login/logout, protected actions)
Caption generation (REST API request + response)
Voting (upvote/downvote, persistence, refresh)
Vote history + statistics
UI features (scroll buttons, progress bar, flashcard/feed toggle)

Issues Found:
API returns only 1 caption instead of 5
Button layout and spacing not aligned
Minor UI spacing issues

Fixes / Changes:
Verified API success via Network tab
Adjusted button alignment (right side)
Added spacing (margin) for upload/generate section
Confirmed voting + data persistence works correctly

02 Admin App

Tested:
Vercel deployment + login flow
Route protection (logged out / non-admin / admin)
Dashboard statistics
Data pages (profiles, images, captions, etc.)
CRUD/editing functions (where available)

Issues Found:
“No rows found” across multiple tables
UI inconsistency between main page and /admin
Unnecessary “Go back home” button
Extra labels (e.g., table: profiles)

Fixes / Changes:
Standardized login page layout (font, spacing)
Removed unnecessary navigation buttons
Cleaned UI labels
Verified issue is due to missing data (not app crash)
Retested editing functions for data updates

03 Prompt Chain Tool

Tested:
Access control (admin / matrix admin only)
Humor flavor CRUD (create/read/update/delete)
Humor flavor steps (create/edit/delete/reorder)
Caption generation using selected flavor
Test tool behavior (flavor + image selection)

Issues Found:
Step order not reindexed after deletion
Newly created flavors not updating immediately
Limited image selection (no upload option)
Theme toggle (light/dark/system) missing

Fixes / Changes:
Verified step order behavior and documented issue
Retested after refresh for data consistency
Identified need for image upload support
Documented missing theme feature

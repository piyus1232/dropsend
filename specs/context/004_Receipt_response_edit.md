# Overview
Currently in this app there is no system of editing receipt ocr value in  extractionSheet. we need to build a system where sheet fields becomes editable  after ocr is done (during needs_review status).

# Things to keep in mind
-Sheet editable fields UI should be made very clean ie with consistent spacing clean UX.
-Reuse existing input, form, Sheet, Button, toast, validation, API, and state-management components/patterns.
-There should be clean save button after user has edited all respective fields. UI should match the existing app theme.
-UPDATE db query should be written in O(N)/O(1) with proper indexes on table and should parallel update if possible.
-Only create a migration/index if genuinely required, following the existing migration structure.
-UX of this should be interactive with proper toast matching current structure.
-On failure: keep the sheet open, preserve the user's edits, show the existing error toast, and re-enable Save

# Output
After user clicks save button sheet should auto close and correctly show latest status  and  first inspect the existing implementation and identify the smallest clean change required, then implement it.

After implementation, review the changes for performance, authorization, validation, stale state/cache, race conditions, and consistency with the existing codebase.
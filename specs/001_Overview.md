# Overview

We are building "DropSend", an AI powered smart expense tracker. 

Users can come and upload photos or screenshots of their receipts/bills, the app can do the OCR, analyse things like:

- Merchant
- Amount
- Date
- Category
- Payment Method
- Currency
- Items

and store it in appropriately.

This is not a normal expense tracker because the user here does not needs to fill the details of expenses manually, he can just upload the receipt or bills pictures.


# Features

1. Image Upload: 
    - File Upload
    - Drag and Drop
    - multiple-image upload (background job processing)
    - Allowed file types: JPG, JPEG, PNG, WebP only.
    - Max file size: 5 MB per file.
    - Max batch size: 8 files per upload (multiple-selection).
    - Images are stored in a Supabase Storage bucket (private, per user) and kept after extraction so the user can view the original receipt alongside the expense.

2. Extraction with OCR:
    - merchant
    - amount
    - date
    - category
    - currency
    - items
    - payment-method

    Each uploaded image becomes a job with the lifecycle: `processing → needs_review → saved / failed`. Multiple uploads appear in a review queue that the user works through.

    Images that are not receipts or cannot be read are marked as `failed`, with options to retry or delete.

3. Edit before saving: After the OCR is done, the agent gives the extracted info to the user for preview or edit. The user can edit the fields if needed before the final save is done. This could help in ensuring the correctness of the details and future inconsistencies.

4. Confidence Score: Show Confidence score along with each extracted field with an appropriate message and an action for the user to (approve/edit), so that the user can focus on the fields which are likely to be incorrect with OCR.

    Confidence is a hybrid of:
    - the model's self-reported per-field confidence, and
    - deterministic validation checks (e.g. items sum matches total, date parses and is not in the future, currency is a valid code).

    Low-confidence fields are highlighted for review.

5. Automatic Categorization: Limited categories with "Other" for non specified to keep it simple.

    Categories:
    - Food & Dining
    - Groceries
    - Transport
    - Shopping
    - Bills & Utilities
    - Entertainment
    - Health
    - Travel
    - Other

6. Duplicate Expense Detection: Analyse the merchant, date, amount, items and compare it across the already stored expenses to avoid addition of duplicate-expenses.

    - The check runs at review time and shows a non-blocking warning ("Possible duplicate of X") with "Save anyway / Discard" actions.
    - An image hash is also stored so that re-uploading the exact same file is caught immediately.

7. Ask-my-expense: Chatbot to ask about the expenses of the user.

    - Uses tool calling over predefined, user-scoped queries (e.g. spend by category in a date range, top merchants, item-level spend). No free-form text-to-SQL.
    - Model choice: to be decided when the feature is built.

8. Expense Dashboard


## Data

- **Default currency:** INR. Dashboard totals are grouped per currency (no currency conversion).
- **Payment methods:** Cash, Card, UPI, Net Banking, Wallet, Other, Unknown.
- **Line items:** Stored as separate, normalized rows (one row per item linked to its expense), as the chatbot needs to answer item-level questions.


## Tech Stack: 

- The app is a monorepo, with a next js web app initialised along with bun, tailwind, shadcn
- Supabase is used as BAAS:
    - Supabase Auth for authentication (sign-in method is email + password).
    - Supabase Postgres for data.
    - Supabase Storage for receipt images.
    - Supabase Realtime for live job/status updates in the UI (instead of Inngest Realtime).
- Inngest would be used for background job processing, queueing and workers.

### AI Vision Model:
Gemma 4 should be used with gemini api for the OCR. Structured-output support and any fallback are to be discussed when the extraction feature is built.


## Styling

Design tokens for the app are stored in globals.css, those tokens should be used to keep the UI consistent.

# Workflow

- Each feature gets its own spec in `specs/features/` (e.g. `002_auth.md`) after it is built. The feature context is given to the agent from the spec in `specs/context/` if needed.
- Each feature is built on its own branch and merged through a PR.

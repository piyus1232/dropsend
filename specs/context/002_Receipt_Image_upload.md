# Overview

A new feature needs to be added to upload images on the app.

This is the main feature as it would further be used to upload the images or screenshots of bills or receipts. Right now just the upload feature should be there with no OCR pipeline.

Few things to keep in mind:
    - File Upload
    - Drag and Drop
    - multiple-image upload (background job processing)
    - Allowed file types: JPG, JPEG, PNG, WebP only.
    - Max file size: 1 MB per file.
    - Max batch size: 4 files per upload (multiple-selection).
    - Images are stored in a Supabase Storage bucket (private, per user) and kept after extraction so the user can view the original receipt alongside the expense.

## Supabase Storage

The images must be stored in supabase storage bucket and should be available for further display to the user. For this we can have our own schema of images and store the storage path of the image as the supabase returns it after uploading. Then we can create the signed url for the image at request time whenever user needs it.

## Inngest

For background processing of images (batch upload), we need to use inngest so it must be initialsed and updated in the code.


## Supabase Realtime

For realtime updates to client while processing images, we should use supabase realtime.

## Frontend Updates

Add a shadcn sidebar with the dashboard tab with current coming soon text in display as is, and a new "Upload Receipt" tan with this new feature to upload receipts.

# Layers

The feature should be carried out in multiple layers:

01: Add schemas for image storage, initialise supabase storage bucket.
02: Add route for single image uploading with supabase realtime for realtime updates to client.
03: Build Shadcn Sidebar and frontend to upload image.
04: Initialise inngest and add worker for batch uploading of images.


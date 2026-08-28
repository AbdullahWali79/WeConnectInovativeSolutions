# Google Drive project uploads

## One-time Google Cloud setup

1. Create or select a Google Cloud project and enable **Google Drive API**.
2. Configure the OAuth consent screen. Add the main admin Google account as a test user while the app is in Testing mode.
3. Create an OAuth 2.0 Client ID of type **Web application**.
4. Add this authorized redirect URI exactly:

   `https://YOUR-DOMAIN/api/admin/google-drive/callback`

5. Add these server-side environment variables in Vercel (Production, Preview, and Development as appropriate):

   - `GOOGLE_DRIVE_CLIENT_ID`
   - `GOOGLE_DRIVE_CLIENT_SECRET`
   - `GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY` (a long random secret; changing it invalidates the saved connection)
   - `NEXT_PUBLIC_SITE_URL` (the same public origin used in the redirect URI)

6. Apply `supabase/migrations/20260828000000_google_drive_project_uploads.sql` to the Supabase database.
7. Redeploy, then open **Admin → Settings → Google Drive**. Connect the account, paste a folder URL, set limits, and mount it.

## Operational notes

- OAuth refresh credentials are AES-256-GCM encrypted before storage and never sent to students.
- Students upload through a Google resumable session, so large files do not pass through the Vercel function body.
- The backend verifies the student identity, MIME type, size, destination folder, and uploader marker before granting `Anyone with the link` / `Viewer` access.
- Replacing or disconnecting a Drive does not delete existing files. It only changes or stops future uploads.
- Google Workspace policies can prohibit public links. In that case, the final permission step will show an error and the Workspace admin must allow external link sharing.

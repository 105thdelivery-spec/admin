# Google Cloud Storage Setup - Quick Start Guide

**Project ID:** `dev-aspire`  
**Bucket Name:** `105th-images`

---

## Step 1: Create the Storage Bucket

1. Go to [Google Cloud Storage Console](https://console.cloud.google.com/storage/browser?project=dev-aspire)

2. Click **"CREATE BUCKET"**

3. Configure the bucket:
   - **Name:** `105th-images`
   - **Location type:** Multi-region
   - **Location:** `us` (United States)
   - **Storage class:** Standard
   - **Access control:** Uniform
   - **Protection tools:** None (or as needed)

4. Click **"CREATE"**

---

## Step 2: Make Bucket Publicly Readable

1. In the [Storage Browser](https://console.cloud.google.com/storage/browser?project=dev-aspire), click on your bucket `105th-images`

2. Go to the **"PERMISSIONS"** tab

3. Click **"GRANT ACCESS"**

4. Add public access:
   - **New principals:** `allUsers`
   - **Role:** Storage Object Viewer
   - Click **"SAVE"**

5. Click **"ALLOW PUBLIC ACCESS"** in the confirmation dialog

---

## Step 3: Create Service Account for Local Development

1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=dev-aspire)

2. Click **"CREATE SERVICE ACCOUNT"**

3. Configure:
   - **Name:** `admin-local-dev`
   - **Description:** `Service account for local admin development`
   - Click **"CREATE AND CONTINUE"**

4. Grant permissions:
   - **Role:** Storage Admin
   - Click **"CONTINUE"**
   - Click **"DONE"**

---

## Step 4: Create and Download Service Account Key

1. In the [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=dev-aspire) page, find `admin-local-dev`

2. Click on the service account email

3. Go to the **"KEYS"** tab

4. Click **"ADD KEY"** → **"Create new key"**

5. Select **"JSON"** format

6. Click **"CREATE"**

7. The key file will download automatically (e.g., `dev-aspire-xxxxx.json`)

8. **IMPORTANT:** Move this file to a safe location:
   ```bash
   mkdir -p ~/.gcp
   mv ~/Downloads/dev-aspire-*.json ~/.gcp/admin-service-account.json
   chmod 600 ~/.gcp/admin-service-account.json
   ```

---

## Step 5: Configure Local Environment

1. Add to your `.env` file:
   ```env
   GCS_BUCKET_NAME=105th-images
   GOOGLE_APPLICATION_CREDENTIALS=/Users/musaver/.gcp/admin-service-account.json
   ```

2. Update the path in the command above if you saved the key elsewhere

---

## Step 6: Configure Cloud Run (Production)

### Option A: Via Console (Easier)

1. Go to [Cloud Run Console](https://console.cloud.google.com/run?project=dev-aspire)

2. Click on your `admin` service (after it's deployed)

3. Click **"EDIT & DEPLOY NEW REVISION"**

4. Scroll to **"Container, Variables & Secrets, Settings, Connections"**

5. Click **"VARIABLES & SECRETS"** tab

6. Click **"ADD VARIABLE"**:
   - **Name:** `GCS_BUCKET_NAME`
   - **Value:** `105th-images`

7. Click **"DEPLOY"**

### Option B: Via gcloud (if you install it later)

```bash
gcloud run services update admin \
  --region=us-central1 \
  --project=dev-aspire \
  --update-env-vars="GCS_BUCKET_NAME=105th-images"
```

---

## Step 7: Grant Cloud Run Service Account Access

1. Go to your bucket: [105th-images Permissions](https://console.cloud.google.com/storage/browser/105th-images;tab=permissions?project=dev-aspire)

2. Click **"GRANT ACCESS"**

3. Add Cloud Run service account:
   - **New principals:** `PROJECT_NUMBER-compute@developer.gserviceaccount.com`
     - To find PROJECT_NUMBER: Go to [Dashboard](https://console.cloud.google.com/home/dashboard?project=dev-aspire) and look for "Project number"
     - Or use: `dev-aspire@appspot.gserviceaccount.com`
   - **Role:** Storage Object Admin
   - Click **"SAVE"**

---

## Step 8: Test Upload Locally

1. Make sure your `.env` file has both variables:
   ```env
   GCS_BUCKET_NAME=105th-images
   GOOGLE_APPLICATION_CREDENTIALS=/Users/musaver/.gcp/admin-service-account.json
   ```

2. Restart your dev server:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

3. Go to add/edit product page

4. Upload an image

5. Check the console - you should see:
   ```
   Upload successful: https://storage.googleapis.com/105th-images/products/...
   ```

6. Verify the image loads in the browser

---

## Verification Checklist

- [ ] Bucket `105th-images` created
- [ ] Bucket is publicly readable (allUsers has Storage Object Viewer role)
- [ ] Service account `admin-local-dev` created
- [ ] Service account key downloaded and saved to `~/.gcp/admin-service-account.json`
- [ ] `.env` file updated with both variables
- [ ] Dev server restarted
- [ ] Test upload successful
- [ ] Image URL accessible in browser

---

## Troubleshooting

### Error: "Could not load the default credentials"

**Solution:** Make sure `GOOGLE_APPLICATION_CREDENTIALS` in `.env` points to the correct JSON key file path.

### Error: "The caller does not have permission"

**Solution:** 
1. Check that the service account has "Storage Admin" role
2. For Cloud Run, ensure the compute service account has access to the bucket

### Error: "Bucket does not exist"

**Solution:** 
1. Verify bucket name is exactly `105th-images` (case-sensitive)
2. Check that `GCS_BUCKET_NAME` in `.env` matches exactly

### Images upload but don't display

**Solution:**
1. Check bucket permissions - ensure `allUsers` has "Storage Object Viewer" role
2. Verify `next.config.ts` includes `storage.googleapis.com` in image domains

---

## Quick Reference

**Bucket URL:** `https://console.cloud.google.com/storage/browser/105th-images?project=dev-aspire`

**Service Accounts:** `https://console.cloud.google.com/iam-admin/serviceaccounts?project=dev-aspire`

**Cloud Run:** `https://console.cloud.google.com/run?project=dev-aspire`

**Image URLs will be:**
```
https://storage.googleapis.com/105th-images/products/1234567890-image.jpg
```

---

## Next Steps After Setup

Once everything is working:

1. **Commit and push changes:**
   ```bash
   git add .
   git commit -m "Complete Google Cloud Storage setup"
   git push origin main
   ```

2. **Deploy to Cloud Run** - The automatic deployment will use GCS in production

3. **Optional:** Delete old Vercel Blob images if no longer needed

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit the service account JSON key to git
- Add `*.json` to `.gitignore` if not already there
- Keep the key file secure with `chmod 600`
- For production, Cloud Run uses its own service account (no key file needed)

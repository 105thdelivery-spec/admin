# Google Cloud Storage Setup Guide

This guide explains how to set up Google Cloud Storage for image uploads in the admin project.

## Overview

The admin project now uses **Google Cloud Storage** instead of Vercel Blob for storing product images and other assets. This provides better integration with Google Cloud Run and more control over your storage.

---

## Prerequisites

1. Google Cloud Project (same one used for Cloud Run)
2. gcloud CLI installed and configured
3. Billing enabled on your GCP project

---

## Setup Steps

### 1. Create a Storage Bucket

```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Set your bucket name (must be globally unique)
export BUCKET_NAME="your-admin-images"

# Create the bucket in a multi-region location for better availability
gcloud storage buckets create gs://${BUCKET_NAME} \
  --project=${PROJECT_ID} \
  --location=US \
  --uniform-bucket-level-access

# Or for a specific region (cheaper, but less redundant)
gcloud storage buckets create gs://${BUCKET_NAME} \
  --project=${PROJECT_ID} \
  --location=us-central1 \
  --uniform-bucket-level-access
```

### 2. Set Bucket Permissions for Public Read Access

Since product images need to be publicly accessible, we'll make the bucket publicly readable:

```bash
# Make all objects in the bucket publicly readable
gcloud storage buckets add-iam-policy-binding gs://${BUCKET_NAME} \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

**Note:** This makes all uploaded images publicly accessible via their URLs. If you need more granular control, you can configure individual object permissions instead.

### 3. Configure CORS (Optional but Recommended)

If you need to upload directly from the browser, configure CORS:

Create a file `cors.json`:
```json
[
  {
    "origin": ["https://your-admin-domain.com", "http://localhost:3000"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS configuration:
```bash
gcloud storage buckets update gs://${BUCKET_NAME} --cors-file=cors.json
```

### 4. Set Environment Variable in Cloud Run

Add the bucket name to your Cloud Run service:

```bash
gcloud run services update admin \
  --region=us-central1 \
  --update-env-vars="GCS_BUCKET_NAME=${BUCKET_NAME}"
```

Or via Google Cloud Console:
1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click on your `admin` service
3. Click "EDIT & DEPLOY NEW REVISION"
4. Add environment variable:
   - Name: `GCS_BUCKET_NAME`
   - Value: Your bucket name (e.g., `your-admin-images`)
5. Click "DEPLOY"

### 5. Grant Cloud Run Service Account Access

The Cloud Run service needs permission to write to the bucket:

```bash
# Get the Cloud Run service account
SERVICE_ACCOUNT=$(gcloud run services describe admin \
  --region=us-central1 \
  --format='value(spec.template.spec.serviceAccountName)')

# If no custom service account, use the default Compute Engine service account
if [ -z "$SERVICE_ACCOUNT" ]; then
  PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
  SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

# Grant Storage Object Admin role to the service account
gcloud storage buckets add-iam-policy-binding gs://${BUCKET_NAME} \
  --member=serviceAccount:${SERVICE_ACCOUNT} \
  --role=roles/storage.objectAdmin
```

---

## Local Development Setup

For local development, you need to authenticate with Google Cloud:

### Option 1: Application Default Credentials (Recommended)

```bash
# Login with your Google account
gcloud auth application-default login

# Set the environment variable in your .env file
echo "GCS_BUCKET_NAME=your-admin-images" >> .env
```

### Option 2: Service Account Key (Alternative)

1. Create a service account:
```bash
gcloud iam service-accounts create admin-local-dev \
  --display-name="Admin Local Development"
```

2. Grant permissions:
```bash
gcloud storage buckets add-iam-policy-binding gs://${BUCKET_NAME} \
  --member=serviceAccount:admin-local-dev@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/storage.objectAdmin
```

3. Create and download key:
```bash
gcloud iam service-accounts keys create ~/admin-gcs-key.json \
  --iam-account=admin-local-dev@${PROJECT_ID}.iam.gserviceaccount.com
```

4. Set environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/admin-gcs-key.json
```

---

## Environment Variables

Add these to your `.env` file (local) and Cloud Run (production):

```env
# Required
GCS_BUCKET_NAME=your-admin-images

# Optional (for local development with service account key)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

---

## Image URLs

After migration, your images will be accessible at:

```
https://storage.googleapis.com/your-admin-images/products/1234567890-image.jpg
```

**Old Vercel Blob URLs** (still supported for backward compatibility):
```
https://7wrvwal0c4f2v4r6.public.blob.vercel-storage.com/products/image.jpg
```

---

## Testing the Upload

1. Start your local development server:
```bash
npm run dev
```

2. Go to the product add/edit page
3. Upload an image
4. Check the console for the upload URL
5. Verify the image is accessible at the Google Cloud Storage URL

---

## Migrating Existing Images (Optional)

If you want to migrate existing images from Vercel Blob to Google Cloud Storage:

### Option 1: Manual Migration Script

Create a migration script to download from Vercel Blob and upload to GCS:

```javascript
// migrate-images.js
const { Storage } = require('@google-cloud/storage');
const fetch = require('node-fetch');

const storage = new Storage();
const bucket = storage.bucket('your-admin-images');

async function migrateImage(vercelUrl, gcsPath) {
  const response = await fetch(vercelUrl);
  const buffer = await response.buffer();
  
  await bucket.file(gcsPath).save(buffer, {
    metadata: { contentType: response.headers.get('content-type') },
    public: true,
  });
  
  console.log(`Migrated: ${vercelUrl} -> gs://your-admin-images/${gcsPath}`);
}

// Usage
migrateImage(
  'https://vercel-blob-url.com/image.jpg',
  'products/image.jpg'
);
```

### Option 2: Keep Both (Recommended)

The `next.config.ts` is configured to support both Google Cloud Storage and Vercel Blob URLs. This means:
- New uploads go to Google Cloud Storage
- Existing Vercel Blob images continue to work
- No migration needed!

---

## Cost Considerations

Google Cloud Storage pricing (as of 2024):

**Standard Storage (Multi-region US):**
- Storage: $0.026 per GB/month
- Class A operations (uploads): $0.05 per 10,000 operations
- Class B operations (downloads): $0.004 per 10,000 operations
- Network egress: First 1GB free, then varies by region

**Example monthly cost for 10GB of images with 100,000 views:**
- Storage: 10GB × $0.026 = $0.26
- Uploads (1,000): $0.005
- Downloads (100,000): $0.04
- **Total: ~$0.31/month**

Much cheaper than most alternatives!

---

## Troubleshooting

### Upload fails with "GCS_BUCKET_NAME not set"
- Make sure you've set the `GCS_BUCKET_NAME` environment variable in Cloud Run
- For local development, add it to your `.env` file

### Upload fails with "Permission denied"
- Verify the Cloud Run service account has `storage.objectAdmin` role on the bucket
- For local development, run `gcloud auth application-default login`

### Images not loading
- Check that the bucket has public read access: `gcloud storage buckets get-iam-policy gs://your-bucket-name`
- Verify the image URL is correct: `https://storage.googleapis.com/bucket-name/path/to/image.jpg`
- Check `next.config.ts` includes `storage.googleapis.com` in `remotePatterns`

### CORS errors in browser
- Apply the CORS configuration as described in step 3
- Make sure your domain is in the CORS `origin` list

---

## Security Best Practices

1. **Use separate buckets** for different environments (dev, staging, production)
2. **Enable versioning** to recover from accidental deletions:
   ```bash
   gcloud storage buckets update gs://your-bucket --versioning
   ```
3. **Set lifecycle policies** to delete old versions:
   ```bash
   gcloud storage buckets update gs://your-bucket --lifecycle-file=lifecycle.json
   ```
4. **Monitor access** via Cloud Logging
5. **Use signed URLs** for sensitive content (not needed for public product images)

---

## Additional Resources

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Storage Pricing](https://cloud.google.com/storage/pricing)
- [Best Practices](https://cloud.google.com/storage/docs/best-practices)
- [Node.js Client Library](https://cloud.google.com/nodejs/docs/reference/storage/latest)

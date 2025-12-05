# Create Google Cloud Storage Bucket - Complete Visual Guide

**Project:** dev-aspire  
**Bucket Name:** 105th-images

---

## Step 1: Access Google Cloud Storage

1. **Open your browser** and go to:
   ```
   https://console.cloud.google.com/storage/browser?project=dev-aspire
   ```

2. **Sign in** with your Google account if prompted

3. You should see the **Cloud Storage Browser** page

---

## Step 2: Create New Bucket

### 2.1 Click "CREATE BUCKET"

- Look for the blue **"CREATE BUCKET"** button near the top of the page
- Click it

### 2.2 Configure Bucket Name

**Field:** Name your bucket

```
105th-images
```

**Important Notes:**
- ✅ Must be globally unique
- ✅ Only lowercase letters, numbers, hyphens, and underscores
- ✅ Cannot contain spaces
- ❌ If name is taken, try: `105th-images-admin` or `105thdelivery-images`

Click **"CONTINUE"**

---

## Step 3: Choose Location

### 3.1 Location Type

**Select:** Multi-region

**Why?** Better availability and redundancy for your images

### 3.2 Location

**Select:** `us (multiple regions in United States)`

**Options you'll see:**
- ⚪ us (multiple regions in United States) ← **SELECT THIS**
- ⚪ eu (multiple regions in European Union)
- ⚪ asia (multiple regions in Asia)

Click **"CONTINUE"**

---

## Step 4: Choose Storage Class

### 4.1 Default Storage Class

**Select:** Standard

**You'll see these options:**
- ⚪ Standard ← **SELECT THIS**
  - Best for frequently accessed data
  - $0.026 per GB/month
- ⚪ Nearline (30-day minimum)
- ⚪ Coldline (90-day minimum)
- ⚪ Archive (365-day minimum)

**Why Standard?** Product images are accessed frequently by customers

Click **"CONTINUE"**

---

## Step 5: Access Control

### 5.1 Prevent Public Access

**IMPORTANT:** Uncheck this option

```
☐ Enforce public access prevention on this bucket
```

**Make sure it's UNCHECKED** - we need public access for product images

### 5.2 Access Control Model

**Select:** Uniform

**You'll see:**
- ⚪ Fine-grained (object-level permissions)
- ⚪ Uniform (bucket-level permissions) ← **SELECT THIS**

**Why Uniform?** Easier to manage - all objects in bucket have same permissions

Click **"CONTINUE"**

---

## Step 6: Data Protection

### 6.1 Protection Tools

**Leave all UNCHECKED** for now (you can enable later if needed):

```
☐ Object versioning
☐ Retention policy
☐ Bucket lock
```

**Optional (Recommended for production):**
- You can enable **Object versioning** later to protect against accidental deletions

Click **"CONTINUE"**

---

## Step 7: Review and Create

### 7.1 Review Your Settings

You should see a summary:

```
Name: 105th-images
Location type: Multi-region
Location: us
Default storage class: Standard
Access control: Uniform
Public access: Allowed
```

### 7.2 Create the Bucket

Click **"CREATE"**

**If you see a warning about public access:**
- Click **"CONFIRM"** or **"I understand, create anyway"**

---

## Step 8: Make Bucket Publicly Readable

### 8.1 Go to Bucket Permissions

After creation, you'll be on the bucket details page.

1. Click on the **"PERMISSIONS"** tab (near the top)

### 8.2 Grant Public Access

1. Click **"GRANT ACCESS"** button

2. In the "Add principals" dialog:

   **New principals:**
   ```
   allUsers
   ```
   
   **Select a role:**
   - Search for: `Storage Object Viewer`
   - Or navigate: Cloud Storage → Storage Object Viewer
   
3. Click **"SAVE"**

4. **Confirmation dialog will appear:**
   ```
   "This resource will be public and can be accessed by anyone on the Internet"
   ```
   
5. Click **"ALLOW PUBLIC ACCESS"**

---

## Step 9: Verify Bucket Configuration

### 9.1 Check Bucket Details

Click on the **"CONFIGURATION"** tab

**Verify these settings:**

```
✓ Name: 105th-images
✓ Location type: Multi-region
✓ Location: us
✓ Default storage class: Standard
✓ Access control: Uniform
✓ Public access: Allowed
```

### 9.2 Check Permissions

Click on the **"PERMISSIONS"** tab

**You should see:**

```
Principal: allUsers
Role: Storage Object Viewer
```

---

## Step 10: Get Bucket URL

Your bucket is now ready! Images will be accessible at:

```
https://storage.googleapis.com/105th-images/[path-to-file]
```

**Example:**
```
https://storage.googleapis.com/105th-images/products/1701234567890-product.jpg
```

---

## ✅ Bucket Creation Complete!

Your bucket is now:
- ✅ Created with name `105th-images`
- ✅ Located in US multi-region
- ✅ Using Standard storage class
- ✅ Publicly readable (for product images)
- ✅ Ready to receive uploads

---

## Next Steps

### 1. Create Service Account for Local Development

Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=dev-aspire

**Follow these steps:**

1. Click **"CREATE SERVICE ACCOUNT"**

2. **Service account details:**
   - Name: `admin-local-dev`
   - Description: `Service account for local admin development`
   - Click **"CREATE AND CONTINUE"**

3. **Grant permissions:**
   - Click "Select a role"
   - Search for: `Storage Admin`
   - Select: **Storage Admin**
   - Click **"CONTINUE"**

4. Click **"DONE"**

### 2. Create and Download Key

1. In the service accounts list, find `admin-local-dev@dev-aspire.iam.gserviceaccount.com`

2. Click on the **email address**

3. Go to **"KEYS"** tab

4. Click **"ADD KEY"** → **"Create new key"**

5. Select **"JSON"** format

6. Click **"CREATE"**

7. **Key file downloads automatically** (e.g., `dev-aspire-abc123.json`)

### 3. Save the Key File

**On your Mac, run:**

```bash
# Create directory for GCP credentials
mkdir -p ~/.gcp

# Move the downloaded key (replace filename with yours)
mv ~/Downloads/dev-aspire-*.json ~/.gcp/admin-service-account.json

# Secure the file (important!)
chmod 600 ~/.gcp/admin-service-account.json

# Verify it's there
ls -la ~/.gcp/
```

### 4. Update .env File

Add these lines to `/Users/musaver/Desktop/central-distros-105th/username-password/admin/.env`:

```env
# Google Cloud Storage
GCS_BUCKET_NAME=105th-images
GOOGLE_APPLICATION_CREDENTIALS=/Users/musaver/.gcp/admin-service-account.json
```

### 5. Restart Dev Server

```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

### 6. Test Upload

1. Go to: http://localhost:3000/products/add
2. Upload a product image
3. Check console for success message
4. Verify image URL starts with: `https://storage.googleapis.com/105th-images/`

---

## Troubleshooting

### "Bucket name already exists"

**Solution:** Try these alternative names:
- `105th-images-admin`
- `105thdelivery-images`
- `dev-aspire-admin-images`

### "Permission denied" when uploading

**Solution:**
1. Check service account has "Storage Admin" role
2. Verify `GOOGLE_APPLICATION_CREDENTIALS` path is correct
3. Ensure key file has correct permissions (`chmod 600`)

### Images upload but don't display

**Solution:**
1. Verify bucket has public access (allUsers = Storage Object Viewer)
2. Check browser console for CORS errors
3. Verify `next.config.ts` includes `storage.googleapis.com`

---

## Security Checklist

- [ ] Bucket created with uniform access control
- [ ] Public read access granted (allUsers = Storage Object Viewer)
- [ ] Service account created with Storage Admin role
- [ ] Service account key downloaded and secured
- [ ] Key file has restrictive permissions (600)
- [ ] `.env` file updated with credentials
- [ ] Key file path is NOT committed to git

---

## Quick Reference

**Bucket Console:**
https://console.cloud.google.com/storage/browser/105th-images?project=dev-aspire

**Service Accounts:**
https://console.cloud.google.com/iam-admin/serviceaccounts?project=dev-aspire

**IAM Permissions:**
https://console.cloud.google.com/iam-admin/iam?project=dev-aspire

**Your Image URLs:**
```
https://storage.googleapis.com/105th-images/products/[filename]
https://storage.googleapis.com/105th-images/category-icons/[filename]
https://storage.googleapis.com/105th-images/logos/[filename]
```

---

## Summary

You've successfully created a Google Cloud Storage bucket that:
- Stores product images and assets
- Serves images publicly to customers
- Integrates with your admin application
- Works in both local development and production
- Costs approximately $0.026 per GB per month

**Next:** Follow steps 1-6 in "Next Steps" section above to complete the setup!

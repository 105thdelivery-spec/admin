import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Configure route to handle larger request bodies (20MB for 15MB file + form data overhead)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout for large uploads

// Initialize Google Cloud Storage
// For local development, set GOOGLE_APPLICATION_CREDENTIALS or use gcloud auth
const storage = new Storage();

// Helper function to compress image on server side if needed
async function compressImageIfNeeded(file: File): Promise<File> {
  // For very large files (>8MB), we could implement server-side compression here
  // For now, we'll return the original file
  return file;
}

export async function POST(request: NextRequest) {
  console.log('Upload API called (Google Cloud Storage)');

  try {
    // Log request details
    console.log('Processing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const directory = formData.get('directory') as string || 'general';

    console.log('File details:', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      directory
    });

    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed.'
      }, { status: 400 });
    }

    // Validate file size (15MB limit)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size, 'bytes. Max:', maxSize, 'bytes');
      return NextResponse.json({
        error: 'File too large. Maximum size is 15MB.'
      }, { status: 400 });
    }

    // Validate directory parameter
    const allowedDirectories = ['courses', 'batches', 'general', 'products', 'products/banner', 'category-icons', 'logos'];
    if (!allowedDirectories.includes(directory)) {
      console.log('Invalid directory:', directory);
      return NextResponse.json({
        error: 'Invalid directory. Allowed directories: courses, batches, general, products, products/banner, category-icons, logos'
      }, { status: 400 });
    }

    // Check environment variables
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      console.error('GCS_BUCKET_NAME not configured');
      return NextResponse.json({
        error: 'Server configuration error: GCS_BUCKET_NAME not set'
      }, { status: 500 });
    }

    // Sanitize filename - remove spaces and special characters
    const sanitizedFileName = file.name
      .replace(/\s+/g, '-')  // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9.-]/g, '')  // Remove special characters except dots and hyphens
      .toLowerCase();

    // Generate unique filename with directory structure
    const timestamp = Date.now();
    const fileName = `${directory}/${timestamp}-${sanitizedFileName}`;
    console.log('Generated filename:', fileName);

    // Compress file if needed
    const processedFile = await compressImageIfNeeded(file);
    console.log('File processing complete. Final size:', processedFile.size);

    // Upload to Google Cloud Storage with retry logic
    console.log('Starting upload to Google Cloud Storage...');
    let publicUrl: string = '';
    let retries = 3;

    while (retries > 0) {
      try {
        const bucket = storage.bucket(bucketName);
        const blob = bucket.file(fileName);

        // Convert File to Buffer
        const arrayBuffer = await processedFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload file
        await blob.save(buffer, {
          metadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000', // Cache for 1 year
          },
          // Note: public access is managed at bucket level (uniform access)
        });

        // Get public URL
        publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        console.log('Upload successful:', publicUrl);
        break; // Success, exit retry loop

      } catch (uploadError) {
        retries--;
        console.log(`Upload attempt failed, ${retries} retries left:`, uploadError);

        if (retries === 0) {
          throw uploadError; // Re-throw if no retries left
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!publicUrl) {
      throw new Error('Upload failed - no URL returned');
    }

    return NextResponse.json({
      url: publicUrl,
      fileName: fileName
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });

    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
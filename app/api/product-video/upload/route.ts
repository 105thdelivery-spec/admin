import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { put } from '@vercel/blob';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const MAX_VIDEO_SIZE_BYTES = 75 * 1024 * 1024; // 75MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only MP4 and WebM videos are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 75MB.' },
        { status: 400 }
      );
    }

    const rawName = file.name || 'video';
    const sanitizedFileName = rawName
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.-]/g, '')
      .toLowerCase();

    const ext = sanitizedFileName.includes('.') ? sanitizedFileName.split('.').pop() : undefined;
    const safeExt = ext && ['mp4', 'webm'].includes(ext) ? ext : file.type === 'video/webm' ? 'webm' : 'mp4';

    const fileName = `products/videos/${Date.now()}-${sanitizedFileName.replace(/\.(mp4|webm)$/i, '')}.${safeExt}`;

    const blob = await put(fileName, file, { access: 'public' });

    return NextResponse.json({ url: blob.url, fileName });
  } catch (error) {
    console.error('Error uploading product video:', error);
    return NextResponse.json(
      { error: 'Failed to upload video', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



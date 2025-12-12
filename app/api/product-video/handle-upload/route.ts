import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { handleUpload } from '@vercel/blob/client';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_VIDEO_SIZE_BYTES = 75 * 1024 * 1024; // 75MB
const ALLOWED_CONTENT_TYPES = ['video/mp4', 'video/webm'];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('products/videos/')) {
          throw new Error('Invalid upload path');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_VIDEO_SIZE_BYTES,
          tokenPayload: String((session.user as any).id),
        };
      },
      // We don't write to DB here because the admin form will save videoUrl on submit.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in product video handle-upload route:', error);
    return NextResponse.json(
      { error: 'Failed to handle upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



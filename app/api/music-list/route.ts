import { NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Available background music list
const AVAILABLE_MUSIC = ['vlog', 'alone'];

export async function GET() {
  try {
    const musicList = AVAILABLE_MUSIC.map(name => ({
      name,
      url: `/music/${name}.mp3`
    }));

    return NextResponse.json({ musicList });
  } catch (error) {
    console.error('Error fetching music list:', error);
    return NextResponse.json({ error: 'Failed to fetch music list' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { projectId, musicName, volume = 1.0 } = await request.json();

    if (!projectId || !musicName) {
      return NextResponse.json(
        { error: 'Project ID and music name are required' },
        { status: 400 }
      );
    }

    if (!AVAILABLE_MUSIC.includes(musicName)) {
      return NextResponse.json(
        { error: 'Invalid music selection' },
        { status: 400 }
      );
    }

    await db.update(projects)
      .set({
        backgroundMusic: {
          name: musicName,
          volume
        },
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating background music:', error);
    return NextResponse.json(
      { error: 'Failed to update background music' },
      { status: 500 }
    );
  }
} 
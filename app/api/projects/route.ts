import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { projects } from '../../../db/schema';

// GET /api/projects
export async function GET() {
    try {
        const data = await db.select().from(projects);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

// POST /api/projects
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { topic } = body;
        const result = await db.insert(projects).values({
            id: crypto.randomUUID(),
            topic
        }).returning();
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}

// PUT /api/projects
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        const result = await db.update(projects).set({
            ...updates,
            updatedAt: new Date()
        }).where(eq(projects.id, id)).returning();
        if (result.length === 0) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Error updating project:', error);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

// DELETE /api/projects?id=projectId
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }
        const result = await db.delete(projects).where(eq(projects.id, id)).returning();
        if (result.length === 0) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Error deleting project:', error);
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
} 
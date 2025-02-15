import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { projects } from '../../../../db/schema';

interface IParams {
    params: {
        id: string;
    };
}

// GET /api/projects/:id
export async function GET(
    request: NextRequest,
    { params }: IParams
) {
    try {
        const { id } = await Promise.resolve(params);
        
        if (!id) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        const result = await db
            .select()
            .from(projects)
            .where(eq(projects.id, id));

        if (!result || result.length === 0) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Error fetching project:', error);
        return NextResponse.json(
            { error: 'Failed to fetch project' },
            { status: 500 }
        );
    }
} 
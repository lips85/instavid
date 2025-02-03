import { NextResponse } from 'next/server';
import { IVideoGenerationRequest } from '@/types';

export async function POST(req: Request) {
    try {
        const body = await req.json() as IVideoGenerationRequest;
        console.log('Sending request to FastAPI:', body);  // 요청 데이터 로깅

        const response = await fetch(`${process.env.FASTAPI_URL}/generate-video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        console.log('FastAPI response:', data);  // 응답 데이터 로깅

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to generate video');
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Video generation error:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while generating the video.' },
            { status: 500 }
        );
    }
} 
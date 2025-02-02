import { NextResponse } from 'next/server';
import { IVoiceRequest } from '@/types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

interface IVoiceRequest {
    text: string;
    voiceId: string;
    projectId: string;  // projectId 추가
}

export async function POST(req: Request) {
    try {
        const { text, voiceId, projectId } = (await req.json()) as IVoiceRequest;

        if (!text || !voiceId) {
            return NextResponse.json(
                { error: 'Text and voice selection are required.' },
                { status: 400 }
            );
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY!,
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error('Voice generation failed');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // S3에 음성 파일 저장
        const fileName = `${projectId}/voice/voice.mp3`;
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: fileName,
            Body: buffer,
            ContentType: 'audio/mpeg'
        }));

        // S3 URL 생성
        const baseUrl = process.env.CLOUDFRONT_URL
            ? `https://${process.env.CLOUDFRONT_URL}`
            : `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;

        // URL에 타임스탬프 추가하여 캐싱 방지
        const timestamp = Date.now();
        const audioUrl = `${baseUrl}/${fileName}?t=${timestamp}`;
        return NextResponse.json({ audioUrl });

    } catch (error) {
        console.error('Voice generation error:', error);
        return NextResponse.json(
            { error: 'An error occurred while generating the voice.' },
            { status: 500 }
        );
    }
} 
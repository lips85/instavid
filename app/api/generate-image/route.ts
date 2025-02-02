import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

interface IImageRequest {
    prompt: string;
    negativePrompt: string;
    index: number;
    projectId: string;
}

export async function POST(req: Request) {
    try {
        const { prompt, negativePrompt, index, projectId } = (await req.json()) as IImageRequest;

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required.' },
                { status: 400 }
            );
        }

        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'black-forest-labs/FLUX.1-schnell',
                prompt: prompt,
                negative_prompt: negativePrompt || 'text, watermark, signature, paragraph, wording, letters, symbols, writing, nude, nudity, explicit content, obscene, inappropriate, offensive, forbidden, illegal, prohibited, sexual, graphic, violence, gore, blood, disturbing',
                width: 1024,
                height: 1024,
                steps: 4,
                n: 1,
                response_format: 'b64_json'
            }),
        });

        if (!response.ok) {
            throw new Error(`Image generation failed: ${response.statusText}`);
        }

        const data = await response.json();
        const base64Data = data.output.choices[0].image_base64;
        const buffer = Buffer.from(base64Data, 'base64');

        const fileName = `${projectId}/images/scene-${index}.png`;
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: fileName,
            Body: buffer,
            ContentType: 'image/png'
        }));

        const baseUrl = process.env.CLOUDFRONT_URL
            ? `https://${process.env.CLOUDFRONT_URL}`
            : `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;

        const imageUrl = `${baseUrl}/${fileName}`;
        return NextResponse.json({ imageUrl });

    } catch (error: any) {
        console.error('Image generation error:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while generating the image.' },
            { status: 500 }
        );
    }
} 
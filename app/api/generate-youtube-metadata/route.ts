import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { IYoutubeMetadataRequest } from '@/types';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { script } = (await req.json()) as IYoutubeMetadataRequest;

        // Title 생성
        const titleResponse = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `Convert the following transcript into a Youtube shorts title. 
                    Ensure the tone is engaging and suitable for Youtube, with a focus on visuals, 
                    and a call-to-action where appropriate. Maintain the core message while adapting 
                    it for a longer and more expressive format.
                    Maximum Total Text Length: 100 characters including spaces.`
                },
                {
                    role: 'user',
                    content: script
                }
            ],
            temperature: 0.7,
            max_tokens: 100
        });

        // Description 생성
        const descriptionResponse = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `Convert the following transcript into a Youtube shorts description. 
                    Ensure the tone is engaging and suitable for Youtube Shorts, with a focus on visuals, 
                    hashtags, and a call-to-action where appropriate. Maintain the core message while 
                    adapting it for a longer and more expressive format.
                    Include relevant hashtags at the end.`
                },
                {
                    role: 'user',
                    content: script
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        return NextResponse.json({
            title: titleResponse.choices[0].message.content,
            description: descriptionResponse.choices[0].message.content
        });

    } catch (error: any) {
        console.error('Youtube metadata generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate Youtube metadata' },
            { status: 500 }
        );
    }
} 
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { IImagePromptRequest, IImagePrompt } from '@/types';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { subtitles } = (await req.json()) as IImagePromptRequest;

        if (!subtitles?.length) {
            return NextResponse.json(
                { error: 'Subtitles are required.' },
                { status: 400 }
            );
        }

        const prompts: IImagePrompt[] = [];

        for (const subtitle of subtitles) {
            const response = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are an image prompt designer, your task is to convert the following transcript text into image prompt for image generation model.

Here are the style of the image:
Style: Hyperrealism, 8K

***Output the prompt directly without Image Prompt.
***Don't include ", ',double quotes and single quotes`
                    },
                    {
                        role: 'user',
                        content: subtitle.text.replace(/['"]/g, '')
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            });

            prompts.push({
                index: subtitle.index,
                prompt: response.choices[0].message.content || '',
                negativePrompt: 'deformed, bad quality, low resolution, blurry, nsfw',
                timestamp: `${formatTime(subtitle.start)} - ${formatTime(subtitle.end)}`
            });
        }

        return NextResponse.json({ prompts });
    } catch (error) {
        console.error('Image prompt generation error:', error);
        return NextResponse.json(
            { error: 'An error occurred while generating image prompts.' },
            { status: 500 }
        );
    }
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
} 
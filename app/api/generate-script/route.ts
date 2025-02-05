import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { IScriptRequest } from '@/types';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { topic } = (await req.json()) as IScriptRequest;

        if (!topic) {
            return NextResponse.json(
                { error: 'Please enter a topic.' },
                { status: 400 }
            );
        }

        const prompt = `You are a YouTube video script writer. Write a 35-second story for a YouTube video about the following topic:
    Topic: ${topic}

    Requirements:
    - Duration: Exactly 30 seconds (approximately 85-95 words)
    - Style: Engaging storytelling
    - Structure: Clear beginning, middle, and end
    - Tone: Conversational and interesting
    - Format: Pure narrative text only (no scene descriptions or technical directions)
    - Make it unique and fresh, avoiding common storytelling patterns
    - Focus on hooking viewers in the first 5 seconds
    
    Important: Provide ONLY the script text, without any additional formatting or labels.`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4o-mini',
            temperature: 0.8, // Increased for more creativity
            max_tokens: 200,  // Limited to ensure concise output
        });

        const script = completion.choices[0].message.content;

        return NextResponse.json({ script });
    } catch (error) {
        console.error('Script generation error:', error);
        return NextResponse.json(
            { error: 'An error occurred while generating the script.' },
            { status: 500 }
        );
    }
} 
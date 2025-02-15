import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { IScriptRequest } from '@/types';

// OpenAI 클라이언트 초기화 전에 API 키 확인
if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OpenAI API Key');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        let reqData;
        try {
            reqData = await req.json();
        } catch (e) {
            console.error('JSON parsing error:', e);
            return NextResponse.json(
                { error: '잘못된 요청 형식입니다.' },
                { status: 400 }
            );
        }

        const { topic } = reqData as IScriptRequest;

        if (!topic) {
            return NextResponse.json(
                { error: '주제를 입력해주세요.' },
                { status: 400 }
            );
        }

        const prompt = `You are a YouTube video script writer. Write a 45-second story for a YouTube video about the following topic:
    Topic: ${topic}

    Requirements:
    - Duration: Exactly 45 seconds (approximately 105~115 words)
    - Style: Engaging storytelling
    - Structure: Clear beginning, middle, and end
    - Tone: Conversational and interesting
    - Format: Pure narrative text only (no scene descriptions or technical directions)
    - Make it unique and fresh, avoiding common storytelling patterns
    - Focus on hooking viewers in the first 5 seconds
    
    Important: Provide ONLY the script text, without any additional formatting or labels.`;

        try {
            const completion = await openai.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-4o-mini-2024-07-18',
                temperature: 0.8,
                max_tokens: 200,
            });

            const script = completion.choices[0]?.message?.content;

            if (!script) {
                throw new Error('No script generated');
            }

            return NextResponse.json({ script });
        } catch (error: any) {
            console.error('OpenAI API error:', error);

            if (error.status === 401) {
                return NextResponse.json(
                    { error: 'OpenAI API 키가 올바르지 않습니다.' },
                    { status: 401 }
                );
            }

            // API 응답이 HTML인 경우
            if (error.message?.includes('<!DOCTYPE')) {
                return NextResponse.json(
                    { error: 'API 서버 연결에 문제가 발생했습니다.' },
                    { status: 503 }
                );
            }

            return NextResponse.json(
                { error: '스크립트 생성 중 오류가 발생했습니다.' },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('Script generation error:', error);
        return NextResponse.json(
            { error: '요청 처리 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
} 
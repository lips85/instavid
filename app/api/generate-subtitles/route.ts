import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ISubtitleRequest } from '@/types';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { audioUrl } = (await req.json()) as ISubtitleRequest;

        if (!audioUrl) {
            return NextResponse.json(
                { error: 'Audio URL is required.' },
                { status: 400 }
            );
        }

        // S3 URL에서 오디오 파일 다운로드
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
            throw new Error('Failed to fetch audio file from S3');
        }

        const audioBuffer = await audioResponse.arrayBuffer();
        const file = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'word');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Whisper API error: ${response.statusText}`);
        }

        const rawResult = await response.json();

        // n8n 로직과 동일하게 구현
        const words = rawResult.words || [];
        const result = [];

        if (words.length > 0) {
            let startTime = words[0].start;
            let endTime = startTime + 6;
            let currentGroup = [];
            let index = 0;

            for (const word of words) {
                if (word.start < endTime) {
                    currentGroup.push(word.word);
                } else {
                    result.push({
                        text: currentGroup.join(' '),
                        start: startTime,
                        end: word.end,
                        index: index
                    });

                    startTime = word.start;
                    endTime = startTime + 6;
                    currentGroup = [word.word];
                    index++;
                }
            }

            // 마지막 그룹 처리
            if (currentGroup.length > 0) {
                result.push({
                    text: currentGroup.join(' '),
                    start: startTime,
                    end: words[words.length - 1].end,
                    index: index
                });
            }
        }

        return NextResponse.json({
            json: {
                groups: result
            }
        });

    } catch (error: any) {
        console.error('Subtitle generation error:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while generating subtitles.' },
            { status: 500 }
        );
    }
} 
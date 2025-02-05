import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ISubtitleRequest } from '@/types';
import path from 'path';
import fs from 'fs/promises';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// public 폴더 내에 outputs 디렉토리 사용
const OUTPUT_DIR = path.join(process.cwd(), 'public');

export async function POST(req: Request) {
    try {
        const { audioUrl } = (await req.json()) as ISubtitleRequest;

        if (!audioUrl) {
            return NextResponse.json(
                { error: '오디오 URL이 필요합니다.' },
                { status: 400 }
            );
        }

        // 파일 시스템에서 직접 오디오 파일 읽기
        const audioPath = path.join(OUTPUT_DIR, audioUrl);
        const audioBuffer = await fs.readFile(audioPath);

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
            throw new Error(`Whisper API 오류: ${response.statusText}`);
        }

        const rawResult = await response.json();

        // 자막 그룹화 처리
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
        console.error('자막 생성 오류:', error);
        return NextResponse.json(
            { error: error.message || '자막 생성 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
} 
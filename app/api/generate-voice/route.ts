import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

interface IVoiceRequest {
    text: string;
    voiceId: string;
    projectId: string;
}

// public 폴더 내에 outputs 디렉토리 사용
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'outputs');

export async function POST(req: Request) {
    try {
        const { text, voiceId, projectId } = (await req.json()) as IVoiceRequest;

        if (!text || !voiceId) {
            return NextResponse.json(
                { error: '텍스트와 음성을 선택해주세요.' },
                { status: 400 }
            );
        }

        // ElevenLabs API를 사용하여 음성 생성
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
            throw new Error('음성 생성에 실패했습니다.');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 프로젝트별 디렉토리 생성
        const projectDir = path.join(OUTPUT_DIR, projectId, 'audio');
        await mkdir(projectDir, { recursive: true });

        // 음성 파일 저장
        const fileName = 'voice.mp3';
        const filePath = path.join(projectDir, fileName);
        await writeFile(filePath, buffer);

        // URL 경로 생성 (public 폴더 기준)
        const audioUrl = `/outputs/${projectId}/audio/${fileName}`;

        return NextResponse.json({
            audioUrl,
            duration: buffer.length / 32000, // 대략적인 오디오 길이 계산 (초 단위)
        });

    } catch (error) {
        console.error('음성 생성 오류:', error);
        return NextResponse.json(
            { error: '음성 생성 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
} 
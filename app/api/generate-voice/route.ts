import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface IVoiceRequest {
    text: string;
    voiceId: string;
    projectId: string;
}

// public 폴더 내에 outputs 디렉토리 사용
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'outputs');

// 고유한 파일명 생성 함수
function generateUniqueFileName(projectId: string): string {
    const hash = crypto.createHash('md5')
        .update(`${projectId}_${Date.now()}_${Math.random()}`)
        .digest('hex')
        .slice(0, 8);
    return `voice_${hash}.mp3`;
}

export async function POST(req: Request) {
    console.log('🎙️ Voice generation request received');
    
    try {
        const body = await req.json();
        console.log('📝 Request body:', body);
        
        const { text, voiceId, projectId } = body as IVoiceRequest;

        if (!text || !voiceId) {
            console.log('❌ Missing required fields:', { text: !!text, voiceId: !!voiceId });
            return NextResponse.json(
                { error: '텍스트와 음성을 선택해주세요.' },
                { status: 400 }
            );
        }

        // ElevenLabs API 키 확인
        if (!process.env.ELEVENLABS_API_KEY) {
            console.error('❌ ELEVENLABS_API_KEY is not set');
            return NextResponse.json(
                { error: 'API key configuration error' },
                { status: 500 }
            );
        }

        console.log('🔄 Calling ElevenLabs API...');
        
        // ElevenLabs API를 사용하여 음성 생성
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY,
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
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ ElevenLabs API error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(`음성 생성 실패: ${response.statusText}`);
        }

        console.log('✅ ElevenLabs API response received');

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 프로젝트별 디렉토리 생성
        const projectDir = path.join(OUTPUT_DIR, projectId, 'audio');
        console.log('📁 Creating directory:', projectDir);
        
        try {
            await mkdir(projectDir, { recursive: true });
        } catch (err) {
            console.error('❌ Failed to create directory:', err);
            throw new Error('Failed to create directory for audio file');
        }

        // 고유한 파일명 생성
        const fileName = generateUniqueFileName(projectId);
        const filePath = path.join(projectDir, fileName);
        
        console.log('💾 Saving audio file:', {
            fileName,
            filePath,
            fileSize: buffer.length
        });

        try {
            await writeFile(filePath, buffer);
        } catch (err) {
            console.error('❌ Failed to write file:', err);
            throw new Error('Failed to save audio file');
        }

        // URL 경로 생성 (public 폴더 기준)
        const audioUrl = `/outputs/${projectId}/audio/${fileName}`;
        console.log('🔗 Generated audio URL:', audioUrl);

        return NextResponse.json({
            audioUrl,
            duration: buffer.length / 32000,
            fileName
        });

    } catch (error) {
        console.error('❌ Voice generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '음성 생성 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
} 
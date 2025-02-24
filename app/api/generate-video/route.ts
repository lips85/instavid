import { NextResponse } from 'next/server';
import { IVideoGenerationRequest } from '@/types';

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;

// 지연 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
    try {
        const body = await req.json() as IVideoGenerationRequest;
        console.log('비디오 생성 요청:', body);

        let lastError;
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                // 프록시 라우트를 통해 FastAPI 서버 호출
                const response = await fetch('/api/python/generate-video', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                const data = await response.json();
                console.log('FastAPI 응답:', data);

                if (!response.ok) {
                    throw new Error(data.detail || '비디오 생성에 실패했습니다.');
                }

                return NextResponse.json(data);
            } catch (error: any) {
                console.error(`시도 ${i + 1}/${MAX_RETRIES} 실패:`, error);
                lastError = error;

                if (i < MAX_RETRIES - 1) {
                    const delayTime = INITIAL_DELAY * Math.pow(2, i);
                    console.log(`${delayTime / 1000}초 후 재시도합니다...`);
                    await delay(delayTime);
                }
            }
        }

        throw lastError || new Error('알 수 없는 오류가 발생했습니다.');

    } catch (error: any) {
        console.error('비디오 생성 오류:', error);

        // 에러 메시지 개선
        let errorMessage = '비디오 생성 중 오류가 발생했습니다.';
        if (error.message.includes('ECONNREFUSED')) {
            errorMessage = 'FastAPI 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
} 
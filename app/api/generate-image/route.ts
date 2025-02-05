import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

interface IImageRequest {
    prompt: string;
    negativePrompt: string;
    index: number;
    projectId: string;
}

// public 폴더 내에 outputs 디렉토리 사용
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'outputs');

// 재시도 설정
const MAX_RETRIES = 5;
const INITIAL_DELAY = 5000; // 5초
const MAX_CONCURRENT_REQUESTS = 2;

// 요청 큐 관리
let currentRequests = 0;
const requestQueue: (() => Promise<void>)[] = [];

// 지연 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 큐 처리 함수
async function processQueue() {
    if (requestQueue.length === 0 || currentRequests >= MAX_CONCURRENT_REQUESTS) return;

    currentRequests++;
    const request = requestQueue.shift()!;
    try {
        await request();
    } finally {
        currentRequests--;
        processQueue();
    }
}

// FLUX API 호출 함수
async function callFluxAPI(prompt: string, negativePrompt: string, retryCount = 0): Promise<any> {
    try {
        // 요청 전 딜레이 추가
        await delay(1000); // 최소 1초 간격

        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'black-forest-labs/FLUX.1-schnell-Free',
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
            if (response.status === 429 && retryCount < MAX_RETRIES) {
                const delayTime = INITIAL_DELAY * Math.pow(2, retryCount); // 지수 백오프
                console.log(`Rate limit에 걸렸습니다. ${delayTime / 1000}초 후 재시도합니다... (${retryCount + 1}/${MAX_RETRIES})`);
                await delay(delayTime);
                return callFluxAPI(prompt, negativePrompt, retryCount + 1);
            }
            throw new Error(`이미지 생성에 실패했습니다: ${response.statusText}`);
        }

        return response.json();
    } catch (error: any) {
        if (retryCount < MAX_RETRIES) {
            const delayTime = INITIAL_DELAY * Math.pow(2, retryCount);
            console.log(`오류 발생. ${delayTime / 1000}초 후 재시도합니다... (${retryCount + 1}/${MAX_RETRIES})`);
            await delay(delayTime);
            return callFluxAPI(prompt, negativePrompt, retryCount + 1);
        }
        throw error;
    }
}

export async function POST(req: Request) {
    return new Promise((resolve) => {
        const processRequest = async () => {
            try {
                const { prompt, negativePrompt, index, projectId } = (await req.json()) as IImageRequest;

                if (!prompt) {
                    resolve(NextResponse.json(
                        { error: '이미지 프롬프트를 입력해주세요.' },
                        { status: 400 }
                    ));
                    return;
                }

                // FLUX API 호출 (재시도 로직 포함)
                const data = await callFluxAPI(prompt, negativePrompt);
                const base64Data = data.output.choices[0].image_base64;
                const buffer = Buffer.from(base64Data, 'base64');

                // 프로젝트별 디렉토리 생성
                const projectDir = path.join(OUTPUT_DIR, projectId, 'images');
                await mkdir(projectDir, { recursive: true });

                // 이미지 파일 저장
                const fileName = `scene-${index}.png`;
                const filePath = path.join(projectDir, fileName);
                await writeFile(filePath, buffer);

                // URL 경로 생성 (public 폴더 기준)
                const imageUrl = `/outputs/${projectId}/images/${fileName}`;

                resolve(NextResponse.json({
                    imageUrl,
                    width: 1024,
                    height: 1024
                }));

            } catch (error: any) {
                console.error('이미지 생성 오류:', error);
                resolve(NextResponse.json(
                    { error: error.message || '이미지 생성 중 오류가 발생했습니다.' },
                    { status: 500 }
                ));
            }
        };

        // 요청을 큐에 추가
        requestQueue.push(processRequest);
        processQueue();
    });
} 
import { NextRequest, NextResponse } from 'next/server';

// 모든 HTTP 메서드 처리
export async function GET(request: NextRequest) {
    return await proxyRequest(request);
}

export async function POST(request: NextRequest) {
    return await proxyRequest(request);
}

export async function PUT(request: NextRequest) {
    return await proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
    return await proxyRequest(request);
}

// FastAPI 서버로 요청을 프록시하는 함수
async function proxyRequest(request: NextRequest) {
    try {
        // 원본 URL에서 /api/python 부분을 제거하고 FastAPI 서버 URL로 변경
        const url = new URL(request.url);
        const fastApiPath = url.pathname.replace('/api/python', '');
        const fastApiUrl = `http://localhost:8001${fastApiPath}${url.search}`;

        // 요청 헤더 복사
        const headers = new Headers(request.headers);
        headers.set('host', 'localhost:8001');

        // FastAPI 서버로 요청 전달
        const response = await fetch(fastApiUrl, {
            method: request.method,
            headers,
            body: request.body,
        });

        // FastAPI 서버의 응답을 그대로 반환
        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    } catch (error) {
        console.error('FastAPI 프록시 오류:', error);
        return NextResponse.json(
            { error: 'FastAPI 서버에 연결할 수 없습니다.' },
            { status: 500 }
        );
    }
} 
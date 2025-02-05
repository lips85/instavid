import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

interface IMusicInfo {
    fileName: string;
    displayName: string;
    url: string;
}

// 음악 파일 표시 이름 매핑
const MUSIC_DISPLAY_NAMES: Record<string, string> = {
    'vlog': '밝고 경쾌한 브이로그 배경음악',
    'alone': '감성적인 피아노 솔로'
};

// public 폴더 내의 음악 디렉토리 경로
const MUSIC_DIR = path.join(process.cwd(), 'public', 'music');

export async function GET() {
    try {
        // 디렉토리가 없는 경우 빈 배열 반환
        try {
            await readdir(MUSIC_DIR);
        } catch {
            return NextResponse.json({ musicList: [] });
        }

        // 디렉토리 내의 모든 파일 읽기
        const files = await readdir(MUSIC_DIR);

        // MP3 파일만 필터링하고 정보 추출
        const musicList: IMusicInfo[] = files
            .filter(file => file.endsWith('.mp3'))
            .map(file => {
                const fileName = file.replace('.mp3', '');
                return {
                    fileName,
                    displayName: MUSIC_DISPLAY_NAMES[fileName] || fileName,
                    url: `/music/${file}`
                };
            })
            .sort((a, b) => a.displayName.localeCompare(b.displayName));

        return NextResponse.json({ musicList });

    } catch (error) {
        console.error('음악 목록 조회 오류:', error);
        return NextResponse.json(
            { error: '음악 목록을 가져오는데 실패했습니다.' },
            { status: 500 }
        );
    }
} 
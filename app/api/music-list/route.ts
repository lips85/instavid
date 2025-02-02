import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// 우선순위 음악 목록
const PRIORITY_MUSIC = [
    "Battle Of The Beast - The Soundings",
    "Between The Spaces - The Soundlings",
    "Keep Climbing - The Soundings",
    "Keys To Unravel",
    "Shady Guise - The Soundlings"
];

export async function GET() {
    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Prefix: 'background/',  // background 폴더 내의 파일만 조회
        });

        const response = await s3Client.send(command);

        if (!response.Contents) {
            return NextResponse.json({ musicList: [] });
        }

        // MP3 파일만 필터링하고 파일명 추출
        const allMusic = response.Contents
            .filter(item => item.Key?.endsWith('.mp3'))
            .map(item => {
                const fileName = item.Key?.split('/').pop()?.replace('.mp3', '') || '';
                const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`;
                return { fileName, url };
            });

        // 우선순위 음악과 나머지 음악 분리
        const priorityMusic = allMusic.filter(music =>
            PRIORITY_MUSIC.includes(music.fileName)
        ).sort((a, b) =>
            PRIORITY_MUSIC.indexOf(a.fileName) - PRIORITY_MUSIC.indexOf(b.fileName)
        );

        const otherMusic = allMusic
            .filter(music => !PRIORITY_MUSIC.includes(music.fileName))
            .sort((a, b) => a.fileName.localeCompare(b.fileName));

        // 우선순위 음악을 앞에 두고 나머지는 알파벳 순으로 정렬
        const musicList = [...priorityMusic, ...otherMusic];

        return NextResponse.json({ musicList });

    } catch (error) {
        console.error('Error fetching music list:', error);
        return NextResponse.json(
            { error: 'Failed to fetch music list' },
            { status: 500 }
        );
    }
} 
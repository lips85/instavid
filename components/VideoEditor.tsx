'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ISubtitleGroup } from '@/types';
import { useProjectStore } from '@/store/project';

interface VideoEditorProps {
    images: Array<{ url: string; index: number }>;
    audioUrl: string;
    subtitles: ISubtitleGroup[];
    backgroundMusicUrl: string;
    projectId: string;
    script: string;
}

export default function VideoEditor({ 
    images, 
    audioUrl, 
    subtitles, 
    backgroundMusicUrl,
    projectId,
    script 
}: VideoEditorProps) {
    const { updateCurrentProject, getCurrentProject } = useProjectStore();
    const currentProject = getCurrentProject();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [videoData, setVideoData] = useState<{
        url: string;
        youtubeMetadata?: {
            title: string;
            description: string;
        } | null;
    }>(currentProject?.video || { url: '', youtubeMetadata: null });

    const [videoLoaded, setVideoLoaded] = useState(false);

    // FastAPI 서버 URL
    const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8001';

    // URL을 전체 URL로 변환하는 함수 수정
    const getFullUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        
        // 'public/' 접두사 제거 및 경로 정규화
        const normalizedPath = url.replace(/^public\/|^\/+/g, '');
        console.log('Original URL:', url);
        console.log('Normalized URL:', `/${normalizedPath}`);
        return `/${normalizedPath}`;
    };

    // 비디오 URL이 유효한지 확인하는 함수
    const checkVideoUrl = async (url: string) => {
        try {
            console.log('Checking video URL:', url);
            const response = await fetch(url, { method: 'HEAD' });
            console.log('Video URL check response:', response.status);
            return response.ok;
        } catch (error) {
            console.error('Video URL check failed:', error);
            return false;
        }
    };

    // 현재 프로젝트의 비디오 데이터 복원
    useEffect(() => {
        const loadVideo = async () => {
            if (currentProject?.video?.url) {
                const fullUrl = getFullUrl(currentProject.video.url);
                const isValid = await checkVideoUrl(fullUrl);
                
                if (isValid) {
                    setVideoData({
                        ...currentProject.video,
                        url: fullUrl
                    });
                    setVideoLoaded(true);
                } else {
                    setError('비디오 파일을 찾을 수 없습니다. 잠시 후 다시 시도해주세요.');
                    setVideoLoaded(false);
                }
            }
        };

        loadVideo();
    }, [currentProject]);

    // 비디오가 있지만 메타데이터가 없는 경우 메타데이터 생성
    useEffect(() => {
        if (videoData.url && !videoData.youtubeMetadata && script) {
            generateYoutubeMetadata();
        }
    }, [videoData.url, videoData.youtubeMetadata, script]);

    const generateVideo = async () => {
        try {
            setIsLoading(true);
            setError('');
            setProgress(0);

            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 5, 90));
            }, 1000);

            const sortedImages = images.sort((a, b) => a.index - b.index);

            const response = await fetch('/api/generate-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    images: sortedImages.map(img => img.url),
                    audio: audioUrl,
                    subtitles,
                    backgroundMusic: backgroundMusicUrl,
                    projectId
                }),
            });

            clearInterval(progressInterval);
            setProgress(100);

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // 새로운 비디오 데이터 설정 (public/output 경로 사용)
            const newVideoData = {
                url: getFullUrl(data.videoUrl),
                youtubeMetadata: null
            };
            setVideoData(newVideoData);

            // 프로젝트 업데이트 (원본 URL 저장)
            updateCurrentProject({
                video: {
                    url: data.videoUrl, // 원본 경로 저장
                    youtubeMetadata: null
                },
                currentStep: 7
            });

        } catch (err) {
            console.error('Video generation error:', err);
            setError('An error occurred while generating the video.');
        } finally {
            setIsLoading(false);
        }
    };

    const generateYoutubeMetadata = async () => {
        try {
            const response = await fetch('/api/generate-youtube-metadata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ script }),
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            // 새로운 비디오 데이터 설정
            const newVideoData = {
                url: videoData.url,
                youtubeMetadata: data
            };
            setVideoData(newVideoData);

            // 프로젝트 업데이트
            updateCurrentProject({
                video: newVideoData,
                currentStep: 7
            });

        } catch (err) {
            console.error('Metadata generation error:', err);
            setError('Failed to generate YouTube metadata');
        }
    };

    return (
        <div className="space-y-4 mt-8 border-t pt-8">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Step 7: Generate Final Video & Metadata</h2>
                <Button
                    onClick={generateVideo}
                    disabled={isLoading}
                >
                    {isLoading ? 'Generating Video...' : 'Generate Video'}
                </Button>
            </div>

            {isLoading && (
                <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-gray-500">
                        Generating video... {Math.round(progress)}%
                    </p>
                </div>
            )}

            {error && (
                <div className="text-red-500 text-sm">{error}</div>
            )}

            {videoData.url && (
                <div className="space-y-2">
                    <h4 className="font-medium">Final Video:</h4>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        {videoLoaded ? (
                            <video 
                                controls
                                className="w-full h-full"
                                crossOrigin="anonymous"
                                key={videoData.url}
                                onError={(e) => {
                                    console.error('Video loading error:', e);
                                    setError('비디오 로딩에 실패했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.');
                                    setVideoLoaded(false);
                                }}
                                onLoadedData={() => {
                                    setVideoLoaded(true);
                                    setError('');
                                }}
                            >
                                <source src={videoData.url} type="video/mp4" />
                                브라우저가 비디오 재생을 지원하지 않습니다.
                            </video>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-white">비디오를 불러오는 중...</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(videoData.url, '_blank')}
                        >
                            Download Video
                        </Button>
                    </div>
                </div>
            )}

            {videoData.url && videoData.youtubeMetadata && (
                <div className="mt-8 space-y-4 border-t pt-4">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">YouTube Metadata</h3>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="mb-4">
                                <h4 className="font-medium text-gray-700">Title</h4>
                                <p className="mt-1">{videoData.youtubeMetadata.title}</p>
                            </div>
                            
                            <div>
                                <h4 className="font-medium text-gray-700">Description</h4>
                                <p className="mt-1 whitespace-pre-wrap">{videoData.youtubeMetadata.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 
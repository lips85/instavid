'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ISubtitleGroup } from '@/types';

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
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [youtubeMetadata, setYoutubeMetadata] = useState<{title: string; description: string} | null>(null);

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

            setVideoUrl(data.videoUrl);
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
            setYoutubeMetadata(data);
        } catch (err) {
            console.error('Metadata generation error:', err);
            setError('Failed to generate YouTube metadata');
        }
    };

    useEffect(() => {
        if (videoUrl && script) {
            generateYoutubeMetadata();
        }
    }, [videoUrl, script]);

    return (
        <div className="space-y-4 mt-8 border-t pt-8">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Step 7: Generate Final Video</h2>
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

            {videoUrl && (
                <div className="space-y-2">
                    <h4 className="font-medium">Final Video:</h4>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <video 
                            controls
                            className="w-full h-full"
                            crossOrigin="anonymous"
                        >
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video element.
                        </video>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(videoUrl, '_blank')}
                        >
                            Download Video
                        </Button>
                    </div>
                </div>
            )}

            {videoUrl && youtubeMetadata && (
                <div className="mt-8 space-y-4 border-t pt-4">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">YouTube Metadata</h3>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="mb-4">
                                <h4 className="font-medium text-gray-700">Title</h4>
                                <p className="mt-1">{youtubeMetadata.title}</p>
                            </div>
                            
                            <div>
                                <h4 className="font-medium text-gray-700">Description</h4>
                                <p className="mt-1 whitespace-pre-wrap">{youtubeMetadata.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { IImagePrompt } from '@/types';
import Image from 'next/image';
import { generateProjectId } from '@/utils/project';

interface ImageGeneratorProps {
    prompts: IImagePrompt[];
}

export default function ImageGenerator({ prompts }: ImageGeneratorProps) {
    const [images, setImages] = useState<Array<{ url: string; index: number }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    const generateImages = async () => {
        try {
            setIsLoading(true);
            setError('');
            setProgress(0);

            const projectId = generateProjectId();
            const totalPrompts = prompts.length;
            let completedPrompts = 0;

            const imagePromises = prompts.map(async (prompt, index) => {
                const response = await fetch('/api/generate-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: prompt.prompt,
                        negativePrompt: prompt.negativePrompt,
                        index: prompt.index,
                        projectId
                    }),
                });

                const data = await response.json();
                console.log('Image generation response:', data);
                
                if (data.error) {
                    throw new Error(data.error);
                }

                completedPrompts++;
                setProgress((completedPrompts / totalPrompts) * 100);

                return {
                    url: data.imageUrl,
                    index: prompt.index
                };
            });

            const generatedImages = await Promise.all(imagePromises);
            console.log('Generated images:', generatedImages);
            setImages(generatedImages.sort((a, b) => a.index - b.index));

        } catch (err) {
            console.error('Image generation error:', err);
            setError('An error occurred while generating images.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4 mt-8">
            <Button
                onClick={generateImages}
                disabled={isLoading || !prompts.length}
            >
                {isLoading ? 'Generating Images...' : 'Generate Images'}
            </Button>

            {isLoading && (
                <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-gray-500">
                        Generating images... {Math.round(progress)}%
                    </p>
                </div>
            )}

            {error && (
                <div className="text-red-500 text-sm">{error}</div>
            )}

            {images.length > 0 && (
                <div className="space-y-4">
                    <h4 className="font-medium">Generated Images:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {images.map((image) => (
                            <div 
                                key={image.index}
                                className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden"
                            >
                                <Image
                                    src={image.url}
                                    alt={`Scene ${image.index + 1}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm">
                                    Scene {image.index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
} 
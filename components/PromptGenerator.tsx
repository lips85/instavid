'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ISubtitleGroup, IImagePrompt } from '@/types';
import ImageGenerator from '@/components/ImageGenerator';

interface PromptGeneratorProps {
  subtitles: ISubtitleGroup[];
  audioUrl: string;
}

export default function PromptGenerator({ subtitles, audioUrl }: PromptGeneratorProps) {
  const [prompts, setPrompts] = useState<IImagePrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const generatePrompts = async () => {
    try {
      setIsLoading(true);
      setError('');
      setProgress(0);

      const progressStep = 100 / subtitles.length;
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return Math.min(prev + progressStep / 10, 90);
        });
      }, 1000);

      const response = await fetch('/api/generate-image-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subtitles }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPrompts(data.prompts);
    } catch (err) {
      console.error('Prompt generation error:', err);
      setError('An error occurred while generating image prompts.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold mb-4">Step 4: Generate Image Prompts</h2>
        <Button
          onClick={generatePrompts}
          disabled={isLoading || !subtitles.length}
        >
          {isLoading ? 'Generating Prompts...' : 'Generate Image Prompts'}
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-gray-500">
            Generating image prompts ({Math.round(progress)}%)...
          </p>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {prompts.length > 0 && (
        <>
          <div className="space-y-4">
            <h4 className="font-medium">Generated Image Prompts:</h4>
            <div className="space-y-2">
              {prompts.map((prompt) => (
                <div 
                  key={prompt.index}
                  className="p-3 bg-gray-50 rounded-lg"
                >
                  <div className="text-sm text-gray-500 mb-1">
                    Scene {prompt.index + 1} ({prompt.timestamp})
                  </div>
                  <p className="mb-2">{prompt.prompt}</p>
                  <p className="text-sm text-gray-500">
                    Negative: {prompt.negativePrompt}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <ImageGenerator 
            prompts={prompts} 
            audioUrl={audioUrl}
            subtitles={subtitles}
          />
        </>
      )}
    </div>
  );
} 
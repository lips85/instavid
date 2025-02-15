'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ISubtitleGroup } from '@/types';
import { useProjectStore } from '@/store/project';

interface SubtitleGeneratorProps {
  audioUrl: string;
  onSubtitlesGenerated: (subtitles: ISubtitleGroup[]) => void;
}

export default function SubtitleGenerator({ 
  audioUrl, 
  onSubtitlesGenerated 
}: SubtitleGeneratorProps) {
  const { updateCurrentProject, getCurrentProjectId } = useProjectStore();
  const [subtitles, setSubtitles] = useState<ISubtitleGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  // 현재 프로젝트의 자막 데이터 로드
  useEffect(() => {
    const loadProjectData = async () => {
      const projectId = getCurrentProjectId();
      if (!projectId) return;

      try {
        const response = await fetch(`/api/current-project?id=${projectId}`);
        if (!response.ok) {
          throw new Error('Failed to load project data');
        }
        const projectData = await response.json();
        if (projectData?.subtitles) {
          setSubtitles(projectData.subtitles);
          onSubtitlesGenerated(projectData.subtitles);
        }
      } catch (err) {
        console.error('Error loading project data:', err);
        setError('Failed to load project data');
      }
    };

    loadProjectData();
  }, []); // 의존성 배열에서 onSubtitlesGenerated 제거

  const generateSubtitles = async () => {
    try {
      setIsLoading(true);
      setError('');
      setProgress(0);

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/generate-subtitles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioUrl }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      console.log('Subtitle Response:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      const newSubtitles = data.json.groups;
      setSubtitles(newSubtitles);
      onSubtitlesGenerated(newSubtitles);

      // 프로젝트 상태 업데이트
      await updateCurrentProject({
        subtitles: newSubtitles,
        currentStep: 3
      });

    } catch (err) {
      console.error('Subtitle generation error:', err);
      setError('An error occurred while generating subtitles.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-2xl font-bold">Step 3: Generate Subtitles</h2>
      
      <Button
        onClick={generateSubtitles}
        disabled={isLoading}
      >
        {isLoading ? 'Analyzing Audio...' : 'Generate Subtitles'}
      </Button>

      {isLoading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-gray-500">Analyzing audio and generating subtitles...</p>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {subtitles.length > 0 && (
        <div className="space-y-2">
          {subtitles.map((group) => (
            <div 
              key={group.index}
              className="p-3 bg-gray-50 rounded-lg"
            >
              <div className="text-sm text-gray-500 mb-1">
                {formatTime(group.start)} - {formatTime(group.end)}
              </div>
              <p>{group.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
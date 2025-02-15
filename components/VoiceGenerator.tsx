'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { IVoiceOption, ISubtitleGroup, IProject } from '@/types';
import SubtitleGenerator from './SubtitleGenerator';
import { generateProjectId } from '@/utils/project';
import PromptGenerator from './PromptGenerator';
import { useProjectStore } from '@/store/project';

// 음성 옵션 데이터 업데이트
const VOICE_OPTIONS: IVoiceOption[] = [
  { 
    id: 'N2lVS1w4EtoT3dr4eOWO', 
    name: 'Callum', 
    preview_url: '',
    description: 'Characters, Transatlantic - Perfect for storytelling and character voices'
  },
  { 
    id: 'XB0fDUnXU5powFXDhCwa', 
    name: 'Charlotte', 
    preview_url: '',
    description: 'Characters, Swedish - Ideal for Nordic character narratives'
  },
  { 
    id: 'onwK4e9ZLuTAKqWW03F9', 
    name: 'Daniel', 
    preview_url: '',
    description: 'News, British, Authoritative - Great for documentaries and news-style content'
  },
  { 
    id: 'pqHfZKP75CvOlQylNhV4', 
    name: 'Bill', 
    preview_url: '',
    description: 'Narration, American - Perfect for professional narration and storytelling'
  }
];

interface VoiceGeneratorProps {
  script: string;
  topic: string;
}

export default function VoiceGenerator({ script, topic }: VoiceGeneratorProps) {
  const { getCurrentProject, updateCurrentProject, isLoading: storeLoading, error: storeError, clearError } = useProjectStore();
  const [currentProject, setCurrentProject] = useState<IProject | undefined>();

  const [selectedVoice, setSelectedVoice] = useState<string>(VOICE_OPTIONS[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [generatedAudios, setGeneratedAudios] = useState<Array<{url: string, timestamp: number, projectId: string}>>([]);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string>('');
  const [subtitles, setSubtitles] = useState<ISubtitleGroup[]>([]);

  // 에러 상태 초기화
  useEffect(() => {
    if (storeError) {
      setError(storeError);
      clearError();
    }
  }, [storeError, clearError]);

  // 현재 프로젝트 데이터 로드 및 실시간 업데이트
  useEffect(() => {
    const loadProject = async () => {
      try {
        const project = await getCurrentProject();
        if (!project) {
          console.warn('No project found');
          return;
        }
        
        console.log('Loaded project:', project);
        setCurrentProject(project);
        
        // 프로젝트의 음성 데이터가 있는 경우 상태 복원
        if (project.voice?.url) {
          const audioData = {
            url: project.voice.url,
            timestamp: project.voice.timestamp || Date.now(),
            projectId: project.voice.projectId || project.id
          };
          
          setSelectedAudioUrl(audioData.url);
          setGeneratedAudios([audioData]);
          
          if (project.subtitles?.length > 0) {
            setSubtitles(project.subtitles);
          }
        }
      } catch (err) {
        console.error('Error loading project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project data');
      }
    };
    
    loadProject();
    
    // 30초마다 프로젝트 데이터 자동 갱신
    const intervalId = setInterval(loadProject, 30000);
    return () => clearInterval(intervalId);
  }, [getCurrentProject]);

  const generateVoice = async () => {
    if (!selectedVoice) {
        setError('Please select a voice.');
        return;
    }

    if (!currentProject?.id) {
        setError('No active project.');
        return;
    }

    if (!script) {
        setError('No script available.');
        return;
    }

    try {
        setIsLoading(true);
        setError('');
        setProgress(0);
        
        console.log('🎙️ Starting voice generation:', {
            projectId: currentProject.id,
            voiceId: selectedVoice,
            scriptLength: script.length
        });
        
        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + 10, 90));
        }, 500);

        const response = await fetch('/api/generate-voice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: script,
                voiceId: selectedVoice,
                projectId: currentProject.id
            }),
        });

        clearInterval(progressInterval);
        setProgress(100);

        const data = await response.json();
        console.log('🔄 Voice generation response:', data);

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate voice');
        }

        const newAudio = {
            url: data.audioUrl,
            timestamp: Date.now(),
            projectId: currentProject.id
        };

        console.log('🎵 Setting new audio:', newAudio);

        setGeneratedAudios([newAudio]);
        setSelectedAudioUrl(data.audioUrl);

        // 프로젝트 상태 업데이트 및 저장
        try {
            console.log('💾 Updating project with new audio');
            await updateCurrentProject({
                voice: newAudio,
                currentStep: 2,
                updatedAt: new Date()
            });
            
            // 업데이트 후 프로젝트 데이터 다시 로드
            const updatedProject = await getCurrentProject();
            console.log('✅ Project updated:', updatedProject);
            setCurrentProject(updatedProject);
        } catch (updateErr) {
            console.error('❌ Failed to update project:', updateErr);
            setError('Failed to save voice data');
        }

    } catch (err) {
        console.error('❌ Voice generation error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while generating the voice.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold mb-4">Step 2: Generate Voice</h2>
        <Select
          value={selectedVoice}
          onValueChange={setSelectedVoice}
          disabled={isLoading || storeLoading}
        >
          <SelectTrigger className="w-full text-left justify-start">
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent>
            {VOICE_OPTIONS.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{voice.name}</span>
                  <span className="text-sm text-gray-500">{voice.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={generateVoice}
        disabled={isLoading || storeLoading || !selectedVoice}
      >
        {isLoading || storeLoading ? 'Generating Voice...' : 'Generate Voice'}
      </Button>

      {(isLoading || storeLoading) && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-gray-500">Generating voice...</p>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {generatedAudios.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Generated Audios:</h4>
          <div className="space-y-2">
            {generatedAudios.map((audio, index) => (
              <div 
                key={audio.timestamp}
                className={`p-3 rounded-lg cursor-pointer ${
                  selectedAudioUrl === audio.url ? 'bg-blue-100' : 'bg-gray-50'
                }`}
                onClick={() => setSelectedAudioUrl(audio.url)}
              >
                <div className="flex items-center justify-between">
                  <span>Audio {index + 1}</span>
                  <div className="text-sm text-gray-500 space-x-2">
                    <span>{new Date(audio.timestamp).toLocaleTimeString()}</span>
                    <span>({audio.projectId})</span>
                  </div>
                </div>
                <audio 
                  key={audio.url}
                  controls 
                  preload="metadata"
                  className="w-full mt-2"
                  crossOrigin="anonymous"
                >
                  <source 
                    src={audio.url} 
                    type="audio/mpeg"
                  />
                  Your browser does not support the audio element.
                </audio>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedAudioUrl && (
        <SubtitleGenerator
          audioUrl={selectedAudioUrl}
          onSubtitlesGenerated={setSubtitles}
        />
      )}
    </div>
  );
} 
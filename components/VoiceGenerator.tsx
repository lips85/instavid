'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { IVoiceOption, ISubtitleGroup } from '@/types';
import SubtitleGenerator from './SubtitleGenerator';
import { generateProjectId } from '@/utils/project';
import PromptGenerator from './PromptGenerator';

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
}

export default function VoiceGenerator({ script }: VoiceGeneratorProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>(VOICE_OPTIONS[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [generatedAudios, setGeneratedAudios] = useState<Array<{url: string, timestamp: number, projectId: string}>>([]);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string>('');
  const [subtitles, setSubtitles] = useState<ISubtitleGroup[]>([]);

  const generateVoice = async () => {
    if (!selectedVoice) {
      setError('Please select a voice.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setProgress(0);
      
      const projectId = generateProjectId();
      
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
          projectId
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      console.log('Voice generation response:', data);  // 디버깅용

      if (data.error) {
        throw new Error(data.error);
      }

      // 새로운 오디오를 목록에 추가
      const newAudio = {
        url: data.audioUrl,
        timestamp: Date.now(),
        projectId
      };
      console.log('Adding new audio:', newAudio);  // 디버깅용
      setGeneratedAudios(prev => [...prev, newAudio]);
      setSelectedAudioUrl(data.audioUrl);

    } catch (err) {
      console.error('Voice generation error:', err);
      setError('An error occurred while generating the voice.');
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
          disabled={isLoading}
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
        disabled={isLoading || !selectedVoice}
      >
        {isLoading ? 'Generating Voice...' : 'Generate Voice'}
      </Button>

      {isLoading && (
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
        <>
          <SubtitleGenerator 
            audioUrl={selectedAudioUrl} 
            onSubtitlesGenerated={setSubtitles}
          />
          {subtitles.length > 0 && (
            <PromptGenerator 
              subtitles={subtitles} 
              audioUrl={selectedAudioUrl}
            />
          )}
        </>
      )}
    </div>
  );
} 
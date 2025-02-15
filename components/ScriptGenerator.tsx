'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IScriptResponse } from '@/types';
import VoiceGenerator from '@/components/VoiceGenerator';
import { useProjectStore } from '@/store/project';

export default function ScriptGenerator() {
  const { createProject, getCurrentProject, updateCurrentProject, currentProjectId } = useProjectStore();
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드에서만 실행되도록 설정
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 현재 프로젝트 ID가 변경될 때마다 상태 업데이트
  useEffect(() => {
    if (isClient) {
      (async () => {
        const currentProject = await getCurrentProject();
        if (!currentProject) {
          setTopic('');
          setScript('');
        } else {
          setTopic(currentProject.topic || '');
          setScript(currentProject.script || '');
        }
      })();
    }
  }, [isClient, currentProjectId, getCurrentProject]);

  const generateScript = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // 새 프로젝트 생성 또는 기존 프로젝트 업데이트
      const currentProject = await getCurrentProject();
      if (!currentProject) {
        await createProject(topic);
      } else {
        await updateCurrentProject({ topic });
      }

      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json() as IScriptResponse;

      if (data.error) {
        setError(data.error);
        return;
      }

      const newScript = data.script || '';
      setScript(newScript);

      // 프로젝트 상태 업데이트
      await updateCurrentProject({
        script: newScript,
        currentStep: 1
      });
    } catch (err) {
      console.error('Script generation error:', err);
      setError('An error occurred while generating the script.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 p-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Step 1: AI Script Generator</h2>
        <p className="text-gray-500">
          Enter a video topic and let AI generate a script automatically.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Enter your video topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={isLoading}
        />
        <Button
          onClick={generateScript}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Script'}
        </Button>
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {script && (
        <>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2">Generated Script:</h3>
            <p className="whitespace-pre-wrap">{script}</p>
          </div>
          {currentProjectId && <VoiceGenerator script={script} topic={topic} />}
        </>
      )}
    </div>
  );
} 
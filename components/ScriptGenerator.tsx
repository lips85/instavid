'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IScriptResponse } from '@/types';
import VoiceGenerator from '@/components/VoiceGenerator';
import MusicSelector from './MusicSelector';

export default function ScriptGenerator() {
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const generateScript = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
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

      setScript(data.script || '');
    } catch (err) {
      console.error('Script generation error:', err);
      setError('An error occurred while generating the script.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <VoiceGenerator script={script} />
          <MusicSelector />
        </>
      )}
    </div>
  );
} 
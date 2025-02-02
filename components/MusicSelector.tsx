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

interface IMusicItem {
    fileName: string;
    url: string;
}

export default function MusicSelector() {
    const [musicList, setMusicList] = useState<IMusicItem[]>([]);
    const [selectedMusic, setSelectedMusic] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioUrl, setAudioUrl] = useState<string>('');

    useEffect(() => {
        fetchMusicList();
    }, []);

    const fetchMusicList = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/music-list');
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setMusicList(data.musicList);
        } catch (err) {
            console.error('Error fetching music list:', err);
            setError('Failed to load music list');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMusicSelect = (value: string) => {
        setSelectedMusic(value);
        const selectedItem = musicList.find(item => item.url === value);
        if (selectedItem) {
            setAudioUrl(selectedItem.url);
        }
    };

    const handleRandomSelect = () => {
        const randomIndex = Math.floor(Math.random() * musicList.length);
        const randomMusic = musicList[randomIndex];
        if (randomMusic) {
            setSelectedMusic(randomMusic.url);
            setAudioUrl(randomMusic.url);
        }
    };

    return (
        <div className="space-y-4 mt-8 border-t pt-8">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Step 4: Select Background Music</h3>
                    <Button 
                        onClick={handleRandomSelect}
                        disabled={isLoading || !musicList.length}
                        variant="outline"
                        size="sm"
                    >
                        Random Select
                    </Button>
                </div>
                <Select
                    value={selectedMusic}
                    onValueChange={handleMusicSelect}
                    disabled={isLoading}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose background music for your video" />
                    </SelectTrigger>
                    <SelectContent>
                        {musicList.map((music) => (
                            <SelectItem 
                                key={music.url} 
                                value={music.url}
                            >
                                {music.fileName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {error && (
                <div className="text-red-500 text-sm">{error}</div>
            )}

            {audioUrl && (
                <div className="space-y-2">
                    <h4 className="font-medium">Preview:</h4>
                    <audio 
                        controls 
                        className="w-full"
                        preload="metadata"
                        crossOrigin="anonymous"
                    >
                        <source src={audioUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
        </div>
    );
} 
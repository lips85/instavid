'use client';

import { useState, useEffect, useRef } from 'react';
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

interface MusicSelectorProps {
    show: boolean;  // 이미지 생성 후 표시 여부를 제어하기 위한 prop
    onMusicSelect?: (url: string) => void;  // 콜백 추가
}

export default function MusicSelector({ show, onMusicSelect }: MusicSelectorProps) {
    const [musicList, setMusicList] = useState<IMusicItem[]>([]);
    const [selectedMusic, setSelectedMusic] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        fetchMusicList();
    }, []);

    // 선택된 음악이 변경될 때마다 오디오 업데이트
    useEffect(() => {
        if (audioRef.current && selectedMusic) {
            audioRef.current.load();  // 오디오 리로드
            audioRef.current.play();  // 자동 재생
        }
    }, [selectedMusic]);

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
        onMusicSelect?.(value);  // 부모 컴포넌트에 선택된 음악 URL 전달
    };

    const handleRandomSelect = () => {
        const randomIndex = Math.floor(Math.random() * musicList.length);
        const randomMusic = musicList[randomIndex];
        if (randomMusic) {
            setSelectedMusic(randomMusic.url);
        }
    };

    if (!show) return null;  // 이미지 생성 전에는 컴포넌트를 렌더링하지 않음

    return (
        <div className="space-y-4 mt-8 border-t pt-8">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Step 6: Select Background Music</h2>
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

            {selectedMusic && (
                <div className="space-y-2">
                    <h4 className="font-medium">Preview:</h4>
                    <audio 
                        ref={audioRef}
                        controls 
                        className="w-full"
                        preload="metadata"
                        crossOrigin="anonymous"
                    >
                        <source src={selectedMusic} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
        </div>
    );
} 
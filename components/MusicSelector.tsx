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
import { useProjectStore } from '@/store/project';
import { type IProject } from '@/types';

interface IMusicItem {
    fileName: string;
    url: string;
}

interface MusicSelectorProps {
    show: boolean;  // 이미지 생성 후 표시 여부를 제어하기 위한 prop
    onMusicSelect: (url: string) => void;  // 콜백 추가
}

export default async function MusicSelector({ show, onMusicSelect }: MusicSelectorProps) {
    const { updateCurrentProject, getCurrentProject, setCurrentProject } = useProjectStore();
    const [currentProject, setCurrentProjectState] = useState<IProject | null>(null);
    const [musicList, setMusicList] = useState<IMusicItem[]>([]);
    const [selectedMusic, setSelectedMusic] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const loadProject = async () => {
            const project = await getCurrentProject();
            setCurrentProjectState(project);
        };
        loadProject();
    }, [getCurrentProject]);

    // 컴포넌트 마운트 시 프로젝트 데이터와 음악 목록 가져오기
    useEffect(() => {
        const initializeData = async () => {
            try {
                setIsLoading(true);
                await fetchMusicList();
                if (currentProject?.id) {
                    await setCurrentProject(currentProject.id);
                }
            } catch (error) {
                console.error('Error initializing data:', error);
                setError('데이터 초기화에 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        initializeData();
    }, [currentProject?.id, setCurrentProject]);

    // 현재 프로젝트의 배경음악 복원
    useEffect(() => {
        if (currentProject?.backgroundMusic && !selectedMusic) {
            console.log('Restoring background music:', currentProject.backgroundMusic);
            setSelectedMusic(currentProject.backgroundMusic.name);
            onMusicSelect(currentProject.backgroundMusic.name);
        }
    }, [currentProject, selectedMusic, onMusicSelect]);

    // 선택된 음악이 변경될 때마다 오디오 업데이트
    useEffect(() => {
        if (audioRef.current && selectedMusic) {
            audioRef.current.load();  // 오디오 리로드
            audioRef.current.play();  // 자동 재생
        }
    }, [selectedMusic]);

    const fetchMusicList = async () => {
        const response = await fetch('/api/music-list');
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        setMusicList(data.musicList);
    };

    const handleMusicSelect = async (url: string) => {
        try {
            setIsLoading(true);
            setSelectedMusic(url);
            onMusicSelect(url);
            
            const project = await getCurrentProject();
            if (!project?.id) {
                throw new Error('No active project');
            }

            // 서버에 현재 프로젝트 상태 저장
            const response = await fetch('/api/projects', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: project.id,
                    backgroundMusic: {
                        name: url,
                        volume: 1
                    },
                    currentStep: 6
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save music selection');
            }

            const updatedProject = await response.json();
            
            // 프로젝트 상태 업데이트 (로컬)
            await updateCurrentProject({
                backgroundMusic: {
                    name: url,
                    volume: 1
                },
                currentStep: 6
            });

            // 현재 프로젝트 새로고침
            await setCurrentProject(project.id);
            setCurrentProjectState(await getCurrentProject());

        } catch (error) {
            console.error('Error saving music selection:', error);
            setError('음악 선택을 저장하는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRandomSelect = () => {
        if (!musicList.length) return;
        // 시드 값으로 현재 시간의 일자를 사용하여 하루 동안은 동일한 결과가 나오도록 함
        const today = new Date();
        const seed = today.getUTCFullYear() * 10000 + 
                    (today.getUTCMonth() + 1) * 100 + 
                    today.getUTCDate();
        const randomIndex = seed % musicList.length;
        const randomMusic = musicList[randomIndex];
        if (randomMusic) {
            handleMusicSelect(randomMusic.url);
        }
    };

    if (!show) return null;  // 이미지 생성 전에는 컴포넌트를 렌더링하지 않음

    return (
        <div className={`space-y-4 mt-8 ${show ? '' : 'hidden'}`}>
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
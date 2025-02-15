import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type IProject } from '@/types';

interface ProjectStore {
    projects: IProject[];
    currentProjectId: string | null;
    isLoading: boolean;
    error: string | null;
    getProjects: () => Promise<void>;
    createProject: (topic: string) => Promise<IProject>;
    updateCurrentProject: (updates: Partial<IProject>) => Promise<void>;
    getCurrentProject: () => Promise<IProject | undefined>;
    setCurrentProject: (projectId: string) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    clearError: () => void;
    getCurrentProjectId: () => string | null;
}

// SSR을 위한 storage 객체
const storage = typeof window !== 'undefined' 
    ? createJSONStorage(() => localStorage) 
    : createJSONStorage(() => ({
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    }));

// 날짜 변환 헬퍼 함수
const convertDates = (project: any): IProject => ({
    ...project,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt)
});

// API 요청 헬퍼 함수
const handleApiError = (error: any): string => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return message;
};

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set, get) => ({
            projects: [],
            currentProjectId: null,
            isLoading: false,
            error: null,

            clearError: () => set({ error: null }),

            // 프로젝트 목록 로드
            getProjects: async () => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch('/api/projects');
                    if (!response.ok) {
                        throw new Error('Failed to fetch projects');
                    }
                    const data = await response.json();
                    const projects = data.map(convertDates);
                    set({ projects, isLoading: false });
                } catch (error) {
                    console.error('Failed to load projects:', error);
                    set({ error: handleApiError(error), isLoading: false });
                }
            },

            // 새 프로젝트 생성
            createProject: async (topic: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch('/api/projects', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ topic, currentStep: 1 })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to create project');
                    }

                    const data = await response.json();
                    const createdProject = convertDates(data);
                    
                    set(state => ({
                        projects: [...state.projects, createdProject],
                        currentProjectId: createdProject.id,
                        isLoading: false
                    }));

                    return createdProject;
                } catch (error) {
                    console.error('Failed to create project:', error);
                    set({ error: handleApiError(error), isLoading: false });
                    throw error;
                }
            },

            // 현재 프로젝트 업데이트
            updateCurrentProject: async (updates: Partial<IProject>) => {
                const { currentProjectId } = get();
                if (!currentProjectId) {
                    return;
                }

                set({ isLoading: true, error: null });
                try {
                    const response = await fetch('/api/projects', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: currentProjectId,
                            ...updates
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update project');
                    }

                    const data = await response.json();
                    const savedProject = convertDates(data);

                    set(state => ({
                        projects: state.projects.map(project =>
                            project.id === currentProjectId
                                ? { ...project, ...savedProject }
                                : project
                        ),
                        isLoading: false
                    }));
                } catch (error) {
                    console.error('Failed to update project:', error);
                    set({ error: handleApiError(error), isLoading: false });
                    throw error;
                }
            },

            // 현재 프로젝트 ID 가져오기
            getCurrentProjectId: () => {
                return get().currentProjectId;
            },

            // 현재 프로젝트 가져오기
            getCurrentProject: async () => {
                const currentProjectId = get().getCurrentProjectId();
                if (!currentProjectId) {
                    return undefined;
                }

                set({ isLoading: true, error: null });
                try {
                    const response = await fetch(`/api/projects/${currentProjectId}`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch project');
                    }
                    const data = await response.json();
                    const project = convertDates(data);

                    set(state => ({
                        projects: state.projects.map(p =>
                            p.id === currentProjectId ? project : p
                        ),
                        isLoading: false
                    }));

                    return project;
                } catch (error) {
                    console.error('Error fetching current project:', error);
                    set({ 
                        error: handleApiError(error), 
                        isLoading: false 
                    });
                    return undefined;
                }
            },

            // 프로젝트 선택
            setCurrentProject: async (projectId: string) => {
                console.log('🔄 프로젝트 전환 시작:', projectId);
                set({ isLoading: true, error: null });
                try {
                    console.log('📡 API 호출 시작:', `/api/projects/${projectId}`);
                    const response = await fetch(`/api/projects/${projectId}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch project: ${response.statusText}`);
                    }
                    const data = await response.json();
                    console.log('📥 서버 응답 데이터:', data);
                    
                    if (!data) {
                        throw new Error('No project data received');
                    }
                    
                    const project = convertDates(data);
                    console.log('🔄 변환된 프로젝트 데이터:', project);
                    
                    set(state => {
                        console.log('이전 상태:', {
                            projectsCount: state.projects.length,
                            currentProjectId: state.currentProjectId
                        });
                        
                        const existingProjectIndex = state.projects.findIndex(p => p.id === projectId);
                        const updatedProjects = existingProjectIndex !== -1
                            ? state.projects.map((p, index) => index === existingProjectIndex ? project : p)
                            : [...state.projects, project];
                        
                        console.log('새로운 상태:', {
                            projectsCount: updatedProjects.length,
                            currentProjectId: projectId
                        });
                        
                        return {
                            projects: updatedProjects,
                            currentProjectId: projectId,
                            isLoading: false
                        };
                    });
                    
                    console.log('✅ 프로젝트 전환 완료');
                } catch (error) {
                    console.error('❌ 프로젝트 전환 실패:', error);
                    set({ 
                        error: handleApiError(error), 
                        isLoading: false,
                        currentProjectId: null 
                    });
                    throw error;
                }
            },

            // 프로젝트 삭제
            deleteProject: async (projectId: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch(`/api/projects?id=${projectId}`, {
                        method: 'DELETE'
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to delete project');
                    }
                    
                    set(state => ({
                        projects: state.projects.filter(p => p.id !== projectId),
                        currentProjectId: state.currentProjectId === projectId ? null : state.currentProjectId,
                        isLoading: false
                    }));

                    // 프로젝트 목록 새로고침
                    await get().getProjects();
                } catch (error) {
                    console.error('Failed to delete project:', error);
                    set({ error: handleApiError(error), isLoading: false });
                }
            }
        }),
        {
            name: 'instavid-projects',
            version: 1,
            storage,
            skipHydration: true,
            partialize: (state) => ({
                projects: state.projects.map(project => ({
                    id: project.id,
                    topic: project.topic,
                    currentStep: project.currentStep
                }))
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    setTimeout(() => {
                        state.getProjects();
                    }, 0);
                }
            }
        }
    )
);

// 수동 hydration을 위한 함수 수정
export const hydrateProjectStore = () => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('instavid-projects');
    if (!stored) return;

    try {
        const parsed = JSON.parse(stored);
        if (!parsed) return;

        // 기본 상태만 복원
        useProjectStore.setState({
            ...parsed,
            isLoading: false,
            error: null
        });

        // 서버에서 최신 데이터 가져오기
        setTimeout(() => {
            useProjectStore.getState().getProjects();
        }, 0);
    } catch (e) {
        console.error('Hydration failed:', e);
    }
}; 
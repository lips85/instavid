'use client';

import { useProjectStore } from '@/store/project';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trash2, FileText, Clock, ListChecks, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate, formatRelativeTime } from '@/utils/date';
import { useState, useEffect, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { type IProject } from '@/types';
import { useToast } from "@/hooks/use-toast";
import ClientOnly from './ClientOnly';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

function SidebarContent({ className }: SidebarProps) {
    const { projects, currentProjectId, setCurrentProject, deleteProject, createProject, getProjects } = useProjectStore();
    const router = useRouter();
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const loadProjects = useCallback(async () => {
        try {
            await getProjects();
        } catch (error) {
            console.error('Failed to load projects:', error);
            toast({
                title: "프로젝트 로드 실패",
                description: "프로젝트 목록을 불러오는데 실패했습니다.",
                variant: "destructive"
            });
        }
    }, [getProjects, toast]);

    useEffect(() => {
        loadProjects();
        
        const interval = setInterval(() => {
            loadProjects();
        }, 5000);

        return () => clearInterval(interval);
    }, [loadProjects]);

    const handleNewProject = async () => {
        if (isLoading) return;
        
        try {
            setIsLoading(true);
            const project = await createProject('새 프로젝트');
            await setCurrentProject(project.id);
            router.push('/');
            await loadProjects(); // 프로젝트 목록 새로고침
        } catch (error) {
            console.error('Failed to create project:', error);
            toast({
                title: "프로젝트 생성 실패",
                description: "새 프로젝트를 생성하는데 실패했습니다.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleProjectClick = async (projectId: string) => {
        if (isLoading || projectId === currentProjectId) return;
        
        try {
            setIsLoading(true);
            await setCurrentProject(projectId);
            await loadProjects(); // 프로젝트 목록 새로고침
            router.push('/');
        } catch (error) {
            console.error('Failed to select project:', error);
            toast({
                title: "프로젝트 선택 실패",
                description: "프로젝트를 선택하는데 실패했습니다.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
        
        try {
            setIsLoading(true);
            await deleteProject(projectId);
            if (currentProjectId === projectId) {
                router.push('/');
            }
            await loadProjects(); // 프로젝트 목록 새로고침
            toast({
                title: "프로젝트 삭제 완료",
                description: "프로젝트가 성공적으로 삭제되었습니다.",
            });
        } catch (error) {
            console.error('Failed to delete project:', error);
            toast({
                title: "프로젝트 삭제 실패",
                description: "프로젝트를 삭제하는데 실패했습니다.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // 날짜 정렬 함수
    const sortProjects = (a: IProject, b: IProject) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    };

    return (
        <div className={cn("pb-12 w-1/4 min-w-[250px] max-w-[300px] bg-gray-50 border-r", className)}>
            <div className="space-y-4 py-4">
                <div key="header" className="px-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-semibold tracking-tight">내 프로젝트</h2>
                        <Button
                            onClick={handleNewProject}
                            size="sm"
                            className="gap-1"
                            disabled={isLoading}
                        >
                            <Plus className="w-4 h-4" />
                            새 프로젝트
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        총 {projects.length}개의 프로젝트
                    </p>
                </div>
                <Separator key="separator" />
                <ScrollArea className="h-[calc(100vh-8rem)]">
                    {projects.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            프로젝트가 없습니다.<br />
                            새 프로젝트를 생성해주세요.
                        </div>
                    ) : (
                        [...projects].sort(sortProjects).map((project) => (
                            <div
                                key={project.id}
                                className={cn(
                                    "p-4 cursor-pointer hover:bg-gray-100 transition-colors",
                                    project.id === currentProjectId && "bg-gray-100"
                                )}
                                onClick={() => handleProjectClick(project.id)}
                            >
                                <div
                                    className={cn(
                                        "rounded-lg border overflow-hidden transition-all duration-200 cursor-pointer",
                                        project.id === currentProjectId 
                                            ? "bg-muted border-muted-foreground/20 shadow-sm" 
                                            : "bg-background hover:bg-muted/50 hover:border-muted-foreground/20"
                                    )}
                                >
                                    <div className="p-3 w-88">
                                        <div className="flex items-start justify-between gap-1">
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <h3 className="font-medium truncate text-sm">
                                                    {project.topic}
                                                </h3>
                                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3 shrink-0" />
                                                    <span key={`time-${project.id}`} suppressHydrationWarning className="truncate">
                                                        {formatRelativeTime(project.updatedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                key={`delete-${project.id}`}
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={(e) => handleDeleteProject(e, project.id)}
                                                disabled={isLoading}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        
                                        <div className="mt-2 flex flex-wrap items-center gap-1">
                                            <Badge key={`step-${project.id}`} variant={project.currentStep === 7 ? "default" : "secondary"} className="shrink-0 text-xs py-0 h-5">
                                                <ListChecks className="w-3 h-3 mr-1 shrink-0" />
                                                <span className="truncate">{project.currentStep}/7 단계</span>
                                            </Badge>
                                            {project.script && (
                                                <Badge key={`script-${project.id}`} variant="outline" className="shrink-0 text-xs py-0 h-5">
                                                    <FileText className="w-3 h-3 mr-1 shrink-0" />
                                                    <span className="truncate">스크립트 완료</span>
                                                </Badge>
                                            )}
                                        </div>
                                        {project.script && (
                                            <div key={`script-content-${project.id}`} className="mt-2 text-xs text-muted-foreground overflow-hidden">
                                                <p className="line-clamp-2 break-all">
                                                    {project.script}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}

export default function Sidebar(props: SidebarProps) {
    return (
        <ClientOnly>
            <SidebarContent {...props} />
        </ClientOnly>
    );
} 
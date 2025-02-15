export interface IScriptResponse {
    script: string;
    error?: string;
}

export interface IScriptRequest {
    topic: string;
}

export interface IVoiceRequest {
    text: string;
    voiceId: string;
}

export interface IVoiceResponse {
    audioUrl: string;
    error?: string;
}

export interface IVoiceOption {
    id: string;
    name: string;
    preview_url: string;
    description: string;
}

export interface IWord {
    word: string;
    start: number;
    end: number;
}

export interface ISubtitleGroup {
    text: string;
    start: number;
    end: number;
    index: number;
}

export interface ISubtitleRequest {
    audioUrl: string;
}

export interface ISubtitleResponse {
    groups: ISubtitleGroup[];
    error?: string;
}

export interface IImagePromptRequest {
    subtitles: ISubtitleGroup[];
}

export interface IImagePrompt {
    index: number;
    prompt: string;
    negativePrompt: string;
    timestamp: string;
}

export interface IImagePromptResponse {
    prompts: IImagePrompt[];
    error?: string;
}

export interface IVideoGenerationRequest {
    projectId: string;
    images: Array<{
        url: string;
        index: number;
    }>;
    audio: string;
    subtitles: Array<{
        text: string;
        start: number;
        end: number;
        index: number;
    }>;
}

export interface IVideoGenerationResponse {
    videoUrl: string;
    error?: string;
}

export interface IYoutubeMetadata {
    title: string;
    description: string;
}

export interface IYoutubeMetadataRequest {
    script: string;
}

export interface IProject {
    id: string;
    topic: string;
    script?: string;
    voice?: {
        url: string;
        timestamp: number;
        projectId: string;
    };
    subtitles?: Array<{
        text: string;
        start: number;
        end: number;
        index: number;
    }>;
    imagePrompts?: Array<{
        index: number;
        prompt: string;
        negativePrompt: string;
        timestamp: string;
    }>;
    images?: Array<{
        url: string;
        index: number;
    }>;
    backgroundMusic?: {
        name: string;
        volume: number;
    };
    video?: {
        url: string;
        youtubeMetadata?: {
            title: string;
            description: string;
        };
    };
    currentStep: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProjectProgress extends IProject {}

export interface IProjectStore {
    projects: IProjectProgress[];
    currentProjectId: string | null;
} 
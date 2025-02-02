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
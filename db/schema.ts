import { sql } from 'drizzle-orm';
import { 
  pgTable,
  text,
  integer,
  timestamp,
  jsonb
} from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  topic: text('topic').notNull(),
  script: text('script'),
  voice: jsonb('voice_url').$type<{
    url: string;
    timestamp: number;
    projectId: string;
  } | null>(),
  backgroundMusic: jsonb('background_music').$type<{
    name: string;
    volume: number;
  } | null>(),
  subtitles: jsonb('subtitles').$type<Array<{
    text: string;
    start: number;
    end: number;
    index: number;
  }> | null>(),
  imagePrompts: jsonb('image_prompts').$type<Array<{
    index: number;
    prompt: string;
    negativePrompt: string;
    timestamp: string;
  }> | null>(),
  images: jsonb('images').$type<Array<{
    url: string;
    index: number;
  }> | null>(),
  video: text('video_url'),
  youtubeMetadata: jsonb('youtube_metadata').$type<{
    title: string;
    description: string;
  } | null>(),
  currentStep: integer('current_step').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
}); 
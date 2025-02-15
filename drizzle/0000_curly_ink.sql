CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"script" text,
	"voice_url" jsonb,
	"background_music" jsonb,
	"subtitles" jsonb,
	"image_prompts" jsonb,
	"images" jsonb,
	"video_url" text,
	"youtube_metadata" jsonb,
	"current_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul' NOT NULL
);

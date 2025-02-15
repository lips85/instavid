-- 기존 데이터의 타임스탬프를 UTC+9로 업데이트
UPDATE projects
SET created_at = created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul',
    updated_at = updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL
    OR updated_at IS NOT NULL;
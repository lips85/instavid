export function generateProjectId(projectId: string, topic: string): string {
    // 프로젝트의 고유 ID를 사용하여 출력 폴더명 생성
    const shortId = projectId.slice(0, 8); // UUID의 앞 8자리만 사용
    const sanitizedTopic = topic
        .replace(/[^a-zA-Z0-9가-힣]/g, '-') // 특수문자를 하이픈으로 변경
        .replace(/-+/g, '-') // 연속된 하이픈을 하나로
        .replace(/^-|-$/g, ''); // 시작과 끝의 하이픈 제거

    return `${sanitizedTopic}-${shortId}`;
} 
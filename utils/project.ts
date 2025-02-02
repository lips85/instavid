export function generateProjectId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // localStorage에서 오늘 날짜의 마지막 프로젝트 번호를 가져옴
    const today = `${year}${month}${day}`;
    const lastProjectNum = localStorage.getItem(`lastProjectNum_${today}`);
    const nextNum = lastProjectNum ? Number(lastProjectNum) + 1 : 1;

    // 새로운 번호를 저장
    localStorage.setItem(`lastProjectNum_${today}`, String(nextNum));

    // YYYYMMDD-XX 형식으로 반환
    return `${today}-${String(nextNum).padStart(2, '0')}`;
} 
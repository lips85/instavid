import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatDate(date: string | Date | null | undefined): Date {
    if (!date) return new Date(0); // 초기값으로 Unix Epoch 사용
    
    try {
        const parsedDate = new Date(date);
        // 유효하지 않은 날짜인 경우 Unix Epoch 반환
        return isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
    } catch {
        return new Date(0);
    }
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
    try {
        const parsedDate = formatDate(date);
        // 서버와 클라이언트 간 일관성을 위해 UTC 기준으로 변환
        const utcDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);
        return formatDistanceToNow(utcDate, {
            addSuffix: true,
            locale: ko
        });
    } catch {
        return '알 수 없음';
    }
} 
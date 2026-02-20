export const normalizeCanonicalGameTime = (input?: string): string | null => {
    if (!input || typeof input !== 'string') return null;
    const match = input.trim().match(/^(\d{1,6}):(\d{1,2}):(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    if (
        month < 1 || month > 12 ||
        day < 1 || day > 31 ||
        hour < 0 || hour > 23 ||
        minute < 0 || minute > 59
    ) {
        return null;
    }
    return `${year}:${month.toString().padStart(2, '0')}:${day.toString().padStart(2, '0')}:${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

export const 提取时间月日 = (input?: string): { month: number; day: number } | null => {
    const canonical = normalizeCanonicalGameTime(input);
    if (!canonical) return null;
    const m = canonical.match(/^\d{1,6}:(\d{2}):(\d{2}):/);
    if (!m) return null;
    const month = Number(m[1]);
    const day = Number(m[2]);
    if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
    return { month, day };
};

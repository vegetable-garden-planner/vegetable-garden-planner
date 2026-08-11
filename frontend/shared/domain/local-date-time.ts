export function localDateTimeToOffsetIso(
  value: string,
  timezoneOffsetMinutes?: number,
): string {
  if (!isLocalDateTime(value)) throw new Error("올바른 날짜와 시각을 입력해 주세요.");
  const localDate = new Date(value);
  const offset = timezoneOffsetMinutes ?? localDate.getTimezoneOffset();
  const sign = offset <= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offset);
  const hours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const minutes = String(absoluteOffset % 60).padStart(2, "0");

  return `${value}:00${sign}${hours}:${minutes}`;
}

export function toLocalDateTimeInput(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error("올바른 날짜가 필요합니다.");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function isLocalDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && toLocalDateTimeInput(parsed) === value;
}

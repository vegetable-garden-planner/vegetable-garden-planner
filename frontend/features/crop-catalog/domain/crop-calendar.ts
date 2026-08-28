/**
 * 작물 상세 페이지의 "성장 시기" 달력.
 *
 * CropPeriod(월 범위)만으로 계산한다 — "파종 후 N일" 같은 구체적인 재배
 * 일수는 카탈로그에 없어서 지어내지 않는다.
 */

export interface MonthRange {
  startMonth: number;
  endMonth: number;
}

/** 범위가 포함하는 월(1~12)을 순서대로 반환한다. 연말을 넘기는 범위도 처리한다 */
export function monthsInRange({ startMonth, endMonth }: MonthRange): number[] {
  if (startMonth <= endMonth) return range(startMonth, endMonth);
  return [...range(startMonth, 12), ...range(1, endMonth)];
}

/** 1월부터 12월까지 전부 포함하면 "연중 재배 가능"으로 본다 */
export function isYearRoundPeriod({ startMonth, endMonth }: MonthRange): boolean {
  return startMonth === 1 && endMonth === 12;
}

function range(start: number, end: number): number[] {
  const months: number[] = [];
  for (let month = start; month <= end; month += 1) months.push(month);
  return months;
}

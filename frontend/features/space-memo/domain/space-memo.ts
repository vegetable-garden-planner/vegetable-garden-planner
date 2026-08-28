export interface SpaceMemo {
  id: string;
  spaceId: string;
  cropId: string | null;
  body: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceMemoInput {
  body: string;
  cropId: string | null;
}

const MAX_BODY_LENGTH = 1000;

export function validateSpaceMemoBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "메모 내용을 입력해 주세요.";
  if (trimmed.length > MAX_BODY_LENGTH) return `메모는 ${MAX_BODY_LENGTH}자 이하로 입력해 주세요.`;
  return null;
}

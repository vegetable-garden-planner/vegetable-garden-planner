import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season.ts";
import {
  isLocalDateTime,
  localDateTimeToOffsetIso,
  toLocalDateTimeInput,
} from "../../../shared/domain/local-date-time.ts";

export const CULTIVATION_RECORD_TYPES = ["work", "growth", "harvest", "watering"] as const;
export type CultivationRecordType = (typeof CULTIVATION_RECORD_TYPES)[number];

export const CULTIVATION_RECORD_TYPE_LABELS: Record<CultivationRecordType, string> = {
  work: "작업",
  growth: "성장 관찰",
  harvest: "수확",
  watering: "물주기",
};

export interface CultivationRecord {
  id: string;
  seasonId: string;
  type: CultivationRecordType;
  occurredAt: string;
  notes: string;
  quantity: number | null;
  unit: string | null;
  photoUrl: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const RECORD_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const RECORD_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** 서버로 보내기 전에 같은 조건으로 먼저 걸러 준다. 서버 검증을 대신하지는 않는다. */
export function validateRecordPhoto(file: File): string | null {
  if (!RECORD_PHOTO_TYPES.some((type) => type === file.type)) {
    return "JPG, PNG, WEBP 이미지 파일만 올릴 수 있어요.";
  }
  if (file.size > RECORD_PHOTO_MAX_BYTES) return "사진은 5MB 이하만 올릴 수 있어요.";
  return null;
}

export interface CultivationRecordInput {
  type: CultivationRecordType;
  occurredAt: string;
  notes: string;
  quantity: number | null;
  unit: string | null;
}

export interface CultivationRecordDraft {
  type: string;
  occurredAtLocal: string;
  notes: string;
  quantity: string;
  unit: string;
}

export type CultivationRecordDraftErrors = Partial<Record<keyof CultivationRecordDraft, string>>;
export type CultivationRecordDraftValidation =
  | { valid: true; value: CultivationRecordInput }
  | { valid: false; errors: CultivationRecordDraftErrors };

export function validateCultivationRecordDraft(
  draft: CultivationRecordDraft,
  season: Pick<PersistedGrowingSeason, "startDate" | "endDate">,
): CultivationRecordDraftValidation {
  const errors: CultivationRecordDraftErrors = {};
  const notes = draft.notes.trim();
  const quantityText = draft.quantity.trim();
  const unit = draft.unit.trim();
  const quantity = quantityText === "" ? null : Number(quantityText);
  const hasValidType = CULTIVATION_RECORD_TYPES.some((type) => type === draft.type);

  if (!hasValidType) errors.type = "기록 종류를 선택해 주세요.";
  if (!isLocalDateTime(draft.occurredAtLocal)) {
    errors.occurredAtLocal = "올바른 기록 시각을 입력해 주세요.";
  } else {
    const occurredOn = draft.occurredAtLocal.slice(0, 10);
    if (occurredOn < season.startDate || occurredOn > season.endDate) {
      errors.occurredAtLocal = "기록 시각은 재배 시즌 안이어야 합니다.";
    }
  }
  if (notes.length > 2000) errors.notes = "메모는 2,000자 이하로 입력해 주세요.";
  if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
    errors.quantity = "수량은 0보다 큰 숫자로 입력해 주세요.";
  }
  if ((quantity === null) !== (unit === "")) {
    const message = "수량과 단위를 함께 입력해 주세요.";
    if (quantity === null) errors.quantity = message;
    if (unit === "") errors.unit = message;
  }
  if (unit.length > 20) errors.unit = "단위는 20자 이하로 입력해 주세요.";

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    value: {
      type: draft.type as CultivationRecordType,
      occurredAt: localDateTimeToOffsetIso(draft.occurredAtLocal),
      notes,
      quantity,
      unit: unit || null,
    },
  };
}

export function createRecordDraft(
  season: Pick<PersistedGrowingSeason, "startDate" | "endDate">,
  record?: CultivationRecord,
): CultivationRecordDraft {
  if (record) {
    return {
      type: record.type,
      occurredAtLocal: toLocalDateTimeInput(new Date(record.occurredAt)),
      notes: record.notes,
      quantity: record.quantity?.toString() ?? "",
      unit: record.unit ?? "",
    };
  }

  const now = new Date();
  const nowLocal = toLocalDateTimeInput(now);
  const today = nowLocal.slice(0, 10);
  const occurredAtLocal = today < season.startDate
    ? `${season.startDate}T09:00`
    : today > season.endDate
      ? `${season.endDate}T09:00`
      : nowLocal;

  return { type: "work", occurredAtLocal, notes: "", quantity: "", unit: "" };
}

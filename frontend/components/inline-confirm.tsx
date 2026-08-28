interface InlineConfirmProps {
  cancelLabel?: string;
  confirmLabel?: string;
  description?: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

export function InlineConfirm({
  cancelLabel = "취소",
  confirmLabel = "삭제하기",
  description,
  disabled,
  onCancel,
  onConfirm,
  title,
}: InlineConfirmProps) {
  return (
    <div className="inline-confirm" role="alert">
      <div className="inline-confirm-copy">
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      <div className="inline-confirm-actions">
        <button disabled={disabled} onClick={onCancel} type="button">{cancelLabel}</button>
        <button disabled={disabled} onClick={onConfirm} type="button">{confirmLabel}</button>
      </div>
    </div>
  );
}

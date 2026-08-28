import type { ReactNode } from "react";
import styles from "./auth.module.css";

interface AuthFieldProps {
  /** 라벨 오른쪽 끝에 붙는 보조 조작(예: 비밀번호 보기 토글) */
  action?: ReactNode;
  children: ReactNode;
  error?: string;
  id: string;
  label: string;
}

export function AuthField({ action, children, error, id, label }: AuthFieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabelRow}>
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      {children}
      {error && <p className={styles.fieldError} id={`${id}-error`}>{error}</p>}
    </div>
  );
}

/** 비밀번호 보기 토글 버튼. 로그인·회원가입이 같은 모양을 공유한다. */
export function PasswordRevealButton({
  onToggle,
  visible,
}: {
  onToggle: () => void;
  visible: boolean;
}) {
  return (
    <button className={styles.revealButton} onClick={onToggle} type="button">
      <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" width="16">
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" />
        {!visible && <path d="M4 20 20 4" strokeLinecap="round" />}
      </svg>
      {visible ? "Show" : "Hide"}
    </button>
  );
}

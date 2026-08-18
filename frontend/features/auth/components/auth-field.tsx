import type { ReactNode } from "react";
import styles from "./auth.module.css";

interface AuthFieldProps {
  children: ReactNode;
  error?: string;
  id: string;
  label: string;
}

export function AuthField({ children, error, id, label }: AuthFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p className={styles.fieldError} id={`${id}-error`}>{error}</p>}
    </div>
  );
}

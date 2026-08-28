import type { ReactNode } from "react";
import styles from "@/features/growing-season/components/growing-season.module.css";

interface SeasonFieldProps {
  children: ReactNode;
  error?: string;
  id: string;
  label: string;
}

export function SeasonField({ children, error, id, label }: SeasonFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p id={`${id}-error`}>{error}</p>}
    </div>
  );
}

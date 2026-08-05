import type { ReactNode } from "react";

interface AuthFieldProps {
  children: ReactNode;
  error?: string;
  id: string;
  label: string;
}

export function AuthField({ children, error, id, label }: AuthFieldProps) {
  return (
    <div>
      <label className="mb-2 block font-bold" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="mt-2 text-sm font-semibold text-red-700" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

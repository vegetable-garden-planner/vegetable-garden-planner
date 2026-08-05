import type { ReactNode } from "react";

interface SeasonFieldProps {
  children: ReactNode;
  error?: string;
  id: string;
  label: string;
}

export function SeasonField({ children, error, id, label }: SeasonFieldProps) {
  return (
    <div>
      <label className="mb-2 block font-bold" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="mt-2 text-sm font-semibold text-red-700" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

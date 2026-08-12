import type { ReactNode } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";

const widthClasses = {
  medium: "max-w-3xl",
  wide: "max-w-4xl",
  full: "max-w-6xl",
} as const;

interface AppPageShellProps {
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  description?: string;
  eyebrow: string;
  homeHref?: string;
  title: string;
  width?: keyof typeof widthClasses;
}

export function AppPageShell({
  action,
  backHref,
  backLabel,
  children,
  description,
  eyebrow,
  homeHref,
  title,
  width = "wide",
}: AppPageShellProps) {
  return (
    <main className="app-page">
      <div className={`mx-auto w-full min-w-0 ${widthClasses[width]}`}>
        <AppHeader action={action} homeHref={homeHref} />
        {backHref && backLabel && <Link className="back-link" href={backHref}>← {backLabel}</Link>}
        <header className="page-hero">
          <p className="page-kicker">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-lead">{description}</p>}
        </header>
        {children}
      </div>
    </main>
  );
}

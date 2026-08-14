import Image from "next/image";
import type { ReactNode } from "react";
import Link from "next/link";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";

const widthClasses = {
  medium: "max-w-3xl",
  wide: "max-w-5xl",
  full: "max-w-[1320px]",
} as const;

interface AppPageShellProps {
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  description?: string;
  eyebrow: string;
  homeHref?: string;
  heroImage?: string;
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
  heroImage,
  title,
  width = "wide",
}: AppPageShellProps) {
  return (
    <main className="app-page">
      <AppHeader action={action} homeHref={homeHref} />
      <div className={`app-page-content mx-auto w-full min-w-0 ${widthClasses[width]}`}>
        {backHref && backLabel && <Link className="back-link" href={backHref}>← {backLabel}</Link>}
        <header className={`page-hero ${heroImage ? "page-hero-photo" : ""}`}>
          {heroImage && <Image alt="" className="page-hero-image" fill priority sizes="100vw" src={heroImage} />}
          {heroImage && <span className="page-hero-shade" aria-hidden="true" />}
          <div className="page-hero-copy">
          <p className="page-kicker">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-lead">{description}</p>}
          </div>
        </header>
        {children}
      </div>
      <AppFooter />
    </main>
  );
}

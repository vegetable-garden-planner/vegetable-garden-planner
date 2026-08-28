"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

interface SessionAwareLinkProps {
  anonymousHref: string;
  anonymousLabel: ReactNode;
  authenticatedHref: string;
  authenticatedLabel: ReactNode;
  className: string;
}

export function SessionAwareLink({
  anonymousHref,
  anonymousLabel,
  authenticatedHref,
  authenticatedLabel,
  className,
}: SessionAwareLinkProps) {
  const auth = useAuthSession();
  const authenticated = auth.state.status === "authenticated";

  return (
    <Link className={className} href={authenticated ? authenticatedHref : anonymousHref}>
      {authenticated ? authenticatedLabel : anonymousLabel}
    </Link>
  );
}

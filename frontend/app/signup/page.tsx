import type { Metadata } from "next";
import { AuthCardShell } from "@/features/auth/components/auth-card-shell";
import { SignupForm } from "@/features/auth/components/signup-form";
import { encodeNextPath, getSafeReturnPath } from "@/features/auth/domain/auth";

export const metadata: Metadata = {
  title: "회원가입 | 심어봄",
  description: "심어봄 회원이 되어 나의 재배 공간과 계획을 관리하세요.",
};

export default async function SignupPage(props: PageProps<"/signup">) {
  const query = await props.searchParams;
  const nextPath = getSafeReturnPath(query.next);

  return (
    <AuthCardShell
      switchHref={`/login?next=${encodeNextPath(nextPath)}`}
      switchLabel="Log in"
      switchText="이미 계정이 있으신가요?"
      title="Sign up"
    >
      <SignupForm nextPath={nextPath} />
    </AuthCardShell>
  );
}

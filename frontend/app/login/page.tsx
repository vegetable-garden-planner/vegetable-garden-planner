import type { Metadata } from "next";
import { AuthCardShell } from "@/features/auth/components/auth-card-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { encodeNextPath, getSafeReturnPath, getSocialLoginErrorMessage } from "@/features/auth/domain/auth";

export const metadata: Metadata = {
  title: "로그인 | 심어봄",
  description: "심어봄에 로그인하고 나의 재배 계획을 관리하세요.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const query = await props.searchParams;
  const nextPath = getSafeReturnPath(query.next);
  const socialError = getSocialLoginErrorMessage(query.socialError);

  return (
    <AuthCardShell
      switchHref={`/signup?next=${encodeNextPath(nextPath)}`}
      switchLabel="Sign up"
      switchText="아직 회원이 아니신가요?"
      title="Log in"
    >
      <LoginForm nextPath={nextPath} socialError={socialError} />
    </AuthCardShell>
  );
}

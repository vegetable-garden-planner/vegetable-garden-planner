import type { Metadata } from "next";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSafeReturnPath, getSocialLoginErrorMessage } from "@/features/auth/domain/auth";

export const metadata: Metadata = {
  title: "로그인 | 심어봄",
  description: "심어봄에 로그인하고 나의 재배 계획을 관리하세요.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const query = await props.searchParams;
  const nextPath = getSafeReturnPath(query.next);
  const socialError = getSocialLoginErrorMessage(query.socialError);

  return (
    <AuthPageShell description="로그인 후 재배 공간과 계획을 이어서 관리할 수 있습니다." eyebrow="회원 인증" title="다시 만나 반가워요">
      <LoginForm nextPath={nextPath} socialError={socialError} />
    </AuthPageShell>
  );
}

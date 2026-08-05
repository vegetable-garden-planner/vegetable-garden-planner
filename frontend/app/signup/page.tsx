import type { Metadata } from "next";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getSafeReturnPath } from "@/features/auth/domain/auth";

export const metadata: Metadata = {
  title: "회원가입 | 심어봄",
  description: "심어봄 회원이 되어 나의 재배 공간과 계획을 관리하세요.",
};

export default async function SignupPage(props: PageProps<"/signup">) {
  const query = await props.searchParams;
  const nextPath = getSafeReturnPath(query.next);

  return (
    <AuthPageShell description="계정을 만들고 나에게 맞는 재배 계획을 저장해 보세요." eyebrow="회원가입" title="심어봄을 시작해요">
      <SignupForm nextPath={nextPath} />
    </AuthPageShell>
  );
}

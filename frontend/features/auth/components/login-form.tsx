"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  validateLogin,
  type LoginErrors,
  type LoginFormValues,
} from "@/features/auth/domain/auth";
import { login } from "@/features/auth/infrastructure/auth-api";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const auth = useAuthSession();
  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});

  function update<K extends keyof LoginFormValues>(key: K, value: LoginFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateLogin(values);

    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    try {
      const user = await login(result.value);
      auth.authenticate(user);
      router.replace(nextPath);
    } catch (error) {
      setErrors({ password: error instanceof Error ? error.message : "로그인하지 못했습니다." });
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <p className="rounded-2xl bg-leaf-soft/60 p-4 text-sm leading-6 text-muted">
        Laravel 세션으로 안전하게 로그인하고 내 재배 데이터를 이어서 관리합니다.
      </p>
      <AuthField error={errors.email} id="login-email" label="이메일">
        <input aria-describedby={errors.email ? "login-email-error" : undefined} aria-invalid={Boolean(errors.email)} autoComplete="email" className="form-input" id="login-email" onChange={(event) => update("email", event.target.value)} placeholder="garden@example.com" type="email" value={values.email} />
      </AuthField>
      <AuthField error={errors.password} id="login-password" label="비밀번호">
        <input aria-describedby={errors.password ? "login-password-error" : undefined} aria-invalid={Boolean(errors.password)} autoComplete="current-password" className="form-input" id="login-password" onChange={(event) => update("password", event.target.value)} type="password" value={values.password} />
      </AuthField>
      <button className="w-full rounded-full bg-leaf px-6 py-3.5 font-bold text-white hover:bg-leaf-dark" type="submit">로그인</button>
      <p className="text-center text-sm text-muted">
        아직 계정이 없나요?{" "}
        <Link className="font-bold text-leaf" href={`/signup?next=${encodeURIComponent(nextPath)}`}>회원가입</Link>
      </p>
    </form>
  );
}

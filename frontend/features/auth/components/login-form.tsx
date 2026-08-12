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
  socialError?: string;
}

export function LoginForm({ nextPath, socialError = "" }: LoginFormProps) {
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
      {socialError && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{socialError}</p>}
      <a className="flex w-full items-center justify-center gap-3 rounded-full border border-ink/15 bg-white px-6 py-3.5 font-bold hover:bg-ink/5" href={`/auth/google/redirect?next=${encodeURIComponent(nextPath)}`}>
        <GoogleMark />
        Google로 계속하기
      </a>
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-ink/10" />
        또는 이메일로 로그인
        <span className="h-px flex-1 bg-ink/10" />
      </div>
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

function GoogleMark() {
  return (
    <svg aria-hidden="true" height="20" viewBox="0 0 24 24" width="20">
      <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z" fill="#FBBC05" />
      <path d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" fill="#EA4335" />
    </svg>
  );
}

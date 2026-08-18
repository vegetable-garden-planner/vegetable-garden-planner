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
import { SocialLoginButtons } from "@/features/auth/components/social-login-buttons";
import styles from "./auth.module.css";

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
    <form className={styles.form} noValidate onSubmit={submit}>
      <p className={styles.notice}>
        Laravel 세션으로 안전하게 로그인하고 내 재배 데이터를 이어서 관리합니다.
      </p>
      {socialError && <p className={styles.error} role="alert">{socialError}</p>}
      <SocialLoginButtons nextPath={nextPath} />
      <div className={styles.divider} aria-hidden="true">또는 이메일로 로그인</div>
      <AuthField error={errors.email} id="login-email" label="이메일">
        <input aria-describedby={errors.email ? "login-email-error" : undefined} aria-invalid={Boolean(errors.email)} autoComplete="email" className="form-input" id="login-email" onChange={(event) => update("email", event.target.value)} placeholder="garden@example.com" type="email" value={values.email} />
      </AuthField>
      <AuthField error={errors.password} id="login-password" label="비밀번호">
        <input aria-describedby={errors.password ? "login-password-error" : undefined} aria-invalid={Boolean(errors.password)} autoComplete="current-password" className="form-input" id="login-password" onChange={(event) => update("password", event.target.value)} type="password" value={values.password} />
      </AuthField>
      <button className={styles.primaryButton} type="submit">로그인</button>
      <p className={styles.switchText}>
        아직 계정이 없나요?{" "}
        <Link href={`/signup?next=${encodeURIComponent(nextPath)}`}>회원가입</Link>
      </p>
    </form>
  );
}

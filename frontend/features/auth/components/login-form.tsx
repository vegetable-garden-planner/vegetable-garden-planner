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
import { loginUser } from "@/features/auth/infrastructure/auth-api";
import { announceAuthSessionChange } from "@/features/auth/infrastructure/browser-auth-session";

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof LoginFormValues>(key: K, value: LoginFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const result = validateLogin(values);

    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    setSubmitting(true);
    try {
      await loginUser(result.value);
      announceAuthSessionChange();
      router.replace(nextPath);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "로그인하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <AuthField error={errors.email} id="login-email" label="이메일">
        <input aria-describedby={errors.email ? "login-email-error" : undefined} aria-invalid={Boolean(errors.email)} aria-label="이메일" autoComplete="email" className="form-input" id="login-email" onChange={(event) => update("email", event.target.value)} placeholder="garden@example.com" type="email" value={values.email} />
      </AuthField>
      <AuthField error={errors.password} id="login-password" label="비밀번호">
        <input aria-describedby={errors.password ? "login-password-error" : undefined} aria-invalid={Boolean(errors.password)} autoComplete="current-password" className="form-input" id="login-password" onChange={(event) => update("password", event.target.value)} type="password" value={values.password} />
      </AuthField>
      {formError && <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{formError}</p>}
      <button className="w-full rounded-full bg-leaf px-6 py-3.5 font-bold text-white hover:bg-leaf-dark disabled:cursor-wait disabled:opacity-60" disabled={submitting} type="submit">{submitting ? "로그인 중…" : "로그인"}</button>
      <p className="text-center text-sm text-muted">
        아직 계정이 없나요?{" "}
        <Link className="font-bold text-leaf" href={`/signup?next=${encodeURIComponent(nextPath)}`}>회원가입</Link>
      </p>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  validateSignup,
  type SignupErrors,
  type SignupFormValues,
} from "@/features/auth/domain/auth";
import { establishBrowserAuthSession } from "@/features/auth/infrastructure/browser-auth-session";

interface SignupFormProps {
  nextPath: string;
}

export function SignupForm({ nextPath }: SignupFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<SignupFormValues>({
    email: "",
    nickname: "",
    password: "",
    passwordConfirmation: "",
    termsAccepted: false,
    privacyAccepted: false,
  });
  const [errors, setErrors] = useState<SignupErrors>({});

  function update<K extends keyof SignupFormValues>(key: K, value: SignupFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateSignup(values);

    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    establishBrowserAuthSession({
      email: result.value.email,
      nickname: result.value.nickname,
    });
    router.replace(nextPath);
  }

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <p className="rounded-2xl bg-leaf-soft/60 p-4 text-sm leading-6 text-muted">
        Laravel 연동 전 화면 검증 단계입니다. 실제 계정은 생성되지 않으며 비밀번호도 저장하지 않습니다.
      </p>
      <AuthField error={errors.email} id="signup-email" label="이메일">
        <input aria-describedby={errors.email ? "signup-email-error" : undefined} aria-invalid={Boolean(errors.email)} autoComplete="email" className="form-input" id="signup-email" onChange={(event) => update("email", event.target.value)} placeholder="garden@example.com" type="email" value={values.email} />
      </AuthField>
      <AuthField error={errors.nickname} id="signup-nickname" label="닉네임">
        <input aria-describedby={errors.nickname ? "signup-nickname-error" : undefined} aria-invalid={Boolean(errors.nickname)} autoComplete="nickname" className="form-input" id="signup-nickname" maxLength={20} onChange={(event) => update("nickname", event.target.value)} value={values.nickname} />
      </AuthField>
      <AuthField error={errors.password} id="signup-password" label="비밀번호">
        <input aria-describedby={errors.password ? "signup-password-error" : undefined} aria-invalid={Boolean(errors.password)} autoComplete="new-password" className="form-input" id="signup-password" onChange={(event) => update("password", event.target.value)} type="password" value={values.password} />
      </AuthField>
      <AuthField error={errors.passwordConfirmation} id="signup-password-confirmation" label="비밀번호 확인">
        <input aria-describedby={errors.passwordConfirmation ? "signup-password-confirmation-error" : undefined} aria-invalid={Boolean(errors.passwordConfirmation)} autoComplete="new-password" className="form-input" id="signup-password-confirmation" onChange={(event) => update("passwordConfirmation", event.target.value)} type="password" value={values.passwordConfirmation} />
      </AuthField>
      <AgreementCheckbox checked={values.termsAccepted} error={errors.termsAccepted} id="terms" label="(필수) 이용약관에 동의합니다." onChange={(checked) => update("termsAccepted", checked)} />
      <AgreementCheckbox checked={values.privacyAccepted} error={errors.privacyAccepted} id="privacy" label="(필수) 개인정보 처리방침에 동의합니다." onChange={(checked) => update("privacyAccepted", checked)} />
      <button className="w-full rounded-full bg-leaf px-6 py-3.5 font-bold text-white hover:bg-leaf-dark" type="submit">회원가입</button>
      <p className="text-center text-sm text-muted">
        이미 계정이 있나요?{" "}
        <Link className="font-bold text-leaf" href={`/login?next=${encodeURIComponent(nextPath)}`}>로그인</Link>
      </p>
    </form>
  );
}

interface AgreementCheckboxProps {
  checked: boolean;
  error?: string;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}

function AgreementCheckbox({ checked, error, id, label, onChange }: AgreementCheckboxProps) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3" htmlFor={id}>
        <input aria-describedby={error ? `${id}-error` : undefined} aria-invalid={Boolean(error)} checked={checked} className="mt-1 accent-leaf" id={id} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
        <span className="text-sm leading-6">{label}</span>
      </label>
      {error && <p className="mt-2 text-sm font-semibold text-red-700" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

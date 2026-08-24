"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  encodeNextPath,
  getPasswordRequirements,
  isValidEmailAddress,
  passwordsMatch,
  validateSignup,
  type PasswordRequirements,
  type SignupErrors,
  type SignupFormValues,
} from "@/features/auth/domain/auth";
import {
  checkEmailAvailability,
  registerAndStartSession,
} from "@/features/auth/infrastructure/auth-api";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { ApiError } from "@/shared/infrastructure/api-client";
import styles from "./auth.module.css";

interface SignupFormProps {
  nextPath: string;
}

type EmailCheckState = "idle" | "checking" | "available" | "unavailable";

export function SignupForm({ nextPath }: SignupFormProps) {
  const router = useRouter();
  const auth = useAuthSession();
  const emailCheckId = useRef(0);
  const [values, setValues] = useState<SignupFormValues>(EMPTY_SIGNUP_VALUES);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [emailCheck, setEmailCheck] = useState<EmailCheckState>("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof SignupFormValues>(key: K, value: SignupFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
    if (key === "email") {
      emailCheckId.current += 1;
      setEmailCheck("idle");
    }
  }

  async function verifyEmail(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmailAddress(normalizedEmail)) {
      setErrors((current) => ({ ...current, email: "올바른 이메일 주소를 입력해 주세요." }));
      return false;
    }

    const requestId = emailCheckId.current + 1;
    emailCheckId.current = requestId;
    setEmailCheck("checking");
    setErrors((current) => ({ ...current, email: undefined, form: undefined }));

    try {
      const available = await checkEmailAvailability(normalizedEmail);
      if (requestId !== emailCheckId.current) return false;
      setEmailCheck(available ? "available" : "unavailable");
      if (!available) {
        setErrors((current) => ({ ...current, email: "이미 가입된 이메일입니다." }));
      }
      return available;
    } catch (error) {
      if (requestId !== emailCheckId.current) return false;
      setEmailCheck("idle");
      setErrors((current) => ({ ...current, email: toErrorMessage(error, "이메일 중복을 확인하지 못했습니다.") }));
      return false;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateSignup(values);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    setSubmitting(true);
    const emailAvailable = emailCheck === "available" || await verifyEmail(result.value.email);
    if (!emailAvailable) {
      setSubmitting(false);
      return;
    }

    try {
      const user = await registerAndStartSession(result.value);
      auth.authenticate(user);
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setErrors(toSignupErrors(error));
      setSubmitting(false);
    }
  }

  const passwordRequirements = getPasswordRequirements(values.password);
  const confirmationMatches = passwordsMatch(values.password, values.passwordConfirmation);

  return (
    <form className={styles.form} noValidate onSubmit={submit}>
      <p className={styles.notice}>
        가입하면 바로 로그인되며 비밀번호는 암호화해 저장합니다.
      </p>
      {errors.form && <p className={styles.error} role="alert">{errors.form}</p>}
      <AuthField error={errors.email} id="signup-email" label="이메일">
        <div className={styles.inputRow}>
          <input aria-describedby="signup-email-status signup-email-error" aria-invalid={Boolean(errors.email)} autoCapitalize="none" autoComplete="email" className="form-input min-w-0" id="signup-email" onChange={(event) => update("email", event.target.value)} placeholder="garden@example.com" type="email" value={values.email} />
          <button className={styles.secondaryButton} disabled={emailCheck === "checking" || values.email.length === 0} onClick={() => { void verifyEmail(values.email); }} type="button">
            {emailCheck === "checking" ? "확인 중" : "중복 확인"}
          </button>
        </div>
        <EmailCheckMessage state={emailCheck} />
      </AuthField>
      <AuthField error={errors.nickname} id="signup-nickname" label="닉네임">
        <input aria-describedby="signup-nickname-error" aria-invalid={Boolean(errors.nickname)} autoComplete="nickname" className="form-input" id="signup-nickname" maxLength={20} onChange={(event) => update("nickname", event.target.value)} placeholder="2~20자" value={values.nickname} />
      </AuthField>
      <AuthField error={errors.password} id="signup-password" label="비밀번호">
        <input aria-describedby="signup-password-guide signup-password-error" aria-invalid={Boolean(errors.password)} autoCapitalize="none" autoComplete="new-password" className="form-input" id="signup-password" inputMode="text" lang="en" onChange={(event) => update("password", event.target.value)} spellCheck={false} type={showPassword ? "text" : "password"} value={values.password} />
        <PasswordRequirementList requirements={passwordRequirements} visible={values.password.length > 0} />
      </AuthField>
      <AuthField error={errors.passwordConfirmation} id="signup-password-confirmation" label="비밀번호 확인">
        <input aria-describedby="signup-password-confirmation-status signup-password-confirmation-error" aria-invalid={Boolean(errors.passwordConfirmation)} autoCapitalize="none" autoComplete="new-password" className="form-input" id="signup-password-confirmation" inputMode="text" lang="en" onChange={(event) => update("passwordConfirmation", event.target.value)} spellCheck={false} type={showPassword ? "text" : "password"} value={values.passwordConfirmation} />
        {values.passwordConfirmation.length > 0 && (
          <p className={`${styles.status} ${confirmationMatches ? styles.statusSuccess : styles.fieldError}`} id="signup-password-confirmation-status" role="status">
            {confirmationMatches ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
          </p>
        )}
        <button className={styles.textButton} onClick={() => setShowPassword((current) => !current)} type="button">
          {showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
        </button>
      </AuthField>
      <AgreementCheckbox checked={values.termsAccepted} error={errors.termsAccepted} id="terms" label="(필수) 이용약관에 동의합니다." onChange={(checked) => update("termsAccepted", checked)} />
      <AgreementCheckbox checked={values.privacyAccepted} error={errors.privacyAccepted} id="privacy" label="(필수) 개인정보 처리방침에 동의합니다." onChange={(checked) => update("privacyAccepted", checked)} />
      <button className={styles.primaryButton} disabled={submitting} type="submit">{submitting ? "가입 중" : "회원가입"}</button>
      <p className={styles.switchText}>
        이미 계정이 있나요?{" "}
        <Link href={`/login?next=${encodeNextPath(nextPath)}`}>로그인</Link>
      </p>
    </form>
  );
}

const EMPTY_SIGNUP_VALUES: SignupFormValues = {
  email: "",
  nickname: "",
  password: "",
  passwordConfirmation: "",
  termsAccepted: false,
  privacyAccepted: false,
};

function EmailCheckMessage({ state }: { state: EmailCheckState }) {
  if (state === "available") return <p className={`${styles.status} ${styles.statusSuccess}`} id="signup-email-status" role="status">사용할 수 있는 이메일입니다.</p>;
  if (state === "unavailable") return <p className="sr-only" id="signup-email-status">사용할 수 없는 이메일입니다.</p>;
  return <p className={styles.status} id="signup-email-status">가입 전에 이메일 중복 여부를 확인합니다.</p>;
}

function PasswordRequirementList({
  requirements,
  visible,
}: {
  requirements: PasswordRequirements;
  visible: boolean;
}) {
  const items = [
    ["영문 포함", requirements.hasLetter],
    ["숫자 포함", requirements.hasNumber],
    ["8자 이상", requirements.hasMinimumLength],
  ] as const;

  return (
    <ul className={styles.passwordChecks} id="signup-password-guide">
      {items.map(([label, satisfied]) => (
        <li data-valid={visible && satisfied} key={label}>
          <span aria-hidden="true">{visible && satisfied ? "✓" : "○"}</span> {label}
        </li>
      ))}
    </ul>
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
    <div className={styles.agreement}>
      <label htmlFor={id}>
        <input aria-describedby={error ? `${id}-error` : undefined} aria-invalid={Boolean(error)} checked={checked} id={id} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
        <span>{label}</span>
      </label>
      {error && <p className={styles.fieldError} id={`${id}-error`}>{error}</p>}
    </div>
  );
}

function toSignupErrors(error: unknown): SignupErrors {
  if (!(error instanceof ApiError)) return { form: "회원가입하지 못했습니다." };

  const duplicateEmail = error.code === "EMAIL_ALREADY_REGISTERED";

  return {
    email: error.fields.email?.[0] ?? (duplicateEmail ? error.message : undefined),
    nickname: error.fields.nickname?.[0],
    password: error.fields.password?.[0],
    passwordConfirmation: error.fields.passwordConfirmation?.[0],
    form: Object.keys(error.fields).length === 0 && !duplicateEmail ? error.message : undefined,
  };
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

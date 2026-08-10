export interface LoginFormValues {
  email: string;
  password: string;
}

export interface SignupFormValues extends LoginFormValues {
  nickname: string;
  passwordConfirmation: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  role: string;
  createdAt: string;
}

export type LoginField = keyof LoginFormValues;
export type SignupField = keyof SignupFormValues;
export type LoginErrors = Partial<Record<LoginField, string>>;
export type SignupErrors = Partial<Record<SignupField, string>>;

export type LoginValidation =
  | { valid: true; value: LoginFormValues }
  | { valid: false; errors: LoginErrors };

export type SignupValidation =
  | { valid: true; value: SignupFormValues }
  | { valid: false; errors: SignupErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export function validateLogin(values: LoginFormValues): LoginValidation {
  const email = values.email.trim().toLowerCase();
  const errors: LoginErrors = {};

  validateEmail(email, errors);
  validatePassword(values.password, errors);

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, value: { email, password: values.password } };
}

export function validateSignup(values: SignupFormValues): SignupValidation {
  const email = values.email.trim().toLowerCase();
  const nickname = values.nickname.trim();
  const errors: SignupErrors = {};

  validateEmail(email, errors);
  validatePassword(values.password, errors);

  if (nickname.length < 2 || nickname.length > 20) {
    errors.nickname = "닉네임은 2자 이상 20자 이하로 입력해 주세요.";
  }
  if (values.password !== values.passwordConfirmation) {
    errors.passwordConfirmation = "비밀번호가 일치하지 않습니다.";
  }
  if (!values.termsAccepted) {
    errors.termsAccepted = "이용약관에 동의해 주세요.";
  }
  if (!values.privacyAccepted) {
    errors.privacyAccepted = "개인정보 처리방침에 동의해 주세요.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: { ...values, email, nickname },
  };
}

export function getSafeReturnPath(
  requestedPath: string | string[] | undefined,
  fallback = "/dashboard",
): string {
  if (typeof requestedPath !== "string") {
    return fallback;
  }

  if (!requestedPath.startsWith("/") || requestedPath.startsWith("//") || requestedPath.includes("\\")) {
    return fallback;
  }

  return requestedPath;
}

function validateEmail(
  email: string,
  errors: Pick<LoginErrors, "email">,
) {
  if (!EMAIL_PATTERN.test(email)) {
    errors.email = "올바른 이메일 주소를 입력해 주세요.";
  }
}

function validatePassword(
  password: string,
  errors: Pick<LoginErrors, "password">,
) {
  if (password.length < PASSWORD_MIN_LENGTH || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = "비밀번호는 영문과 숫자를 포함해 8자 이상 입력해 주세요.";
  }
}

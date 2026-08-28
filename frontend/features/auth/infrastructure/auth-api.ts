import type { AuthUser, LoginFormValues, SignupFormValues } from "../domain/auth.ts";
import { ApiError, apiRequest, prepareCsrfCookie } from "../../../shared/infrastructure/api-client.ts";

interface AuthResponse { data: { user: AuthUser } }
interface UserResponse { data: AuthUser }
interface EmailAvailabilityResponse { data: { available: boolean } }

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    return (await apiRequest<UserResponse>("/me")).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function login(values: LoginFormValues): Promise<AuthUser> {
  await prepareCsrfCookie();
  return (await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(values),
  })).data.user;
}

export async function register(values: SignupFormValues): Promise<AuthUser> {
  await prepareCsrfCookie();
  return (await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: values.email,
      nickname: values.nickname,
      password: values.password,
      passwordConfirmation: values.passwordConfirmation,
    }),
  })).data.user;
}

export async function registerAndStartSession(values: SignupFormValues): Promise<AuthUser> {
  const registeredUser = await register(values);
  const sessionUser = await fetchCurrentUser();

  if (!sessionUser || sessionUser.id !== registeredUser.id) {
    throw new ApiError(
      "가입은 완료됐지만 로그인 상태를 시작하지 못했습니다. 로그인해 주세요.",
      401,
      "REGISTRATION_SESSION_FAILED",
    );
  }

  return sessionUser;
}

export async function checkEmailAvailability(email: string): Promise<boolean> {
  return (await apiRequest<EmailAvailabilityResponse>("/auth/email-availability", {
    method: "POST",
    body: JSON.stringify({ email }),
  })).data.available;
}

export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", { method: "POST" });
}

export async function withdraw(): Promise<void> {
  await apiRequest<void>("/me", { method: "DELETE" });
}

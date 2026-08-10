import type { AuthUser, LoginFormValues, SignupFormValues } from "@/features/auth/domain/auth";
import { ApiError, apiRequest, prepareCsrfCookie } from "@/shared/infrastructure/api-client";

interface AuthResponse { data: { user: AuthUser } }
interface UserResponse { data: AuthUser }

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

export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", { method: "POST" });
}

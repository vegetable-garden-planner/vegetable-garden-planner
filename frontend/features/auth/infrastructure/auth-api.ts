import type {
  AuthUser,
  LoginFormValues,
  SignupFormValues,
} from "@/features/auth/domain/auth";
import { apiGetData, apiRequest } from "@/shared/infrastructure/api-client";

interface SessionResponse {
  data: { user: AuthUser };
}

export async function registerUser(values: SignupFormValues) {
  const response = await apiRequest<SessionResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: values.email,
      nickname: values.nickname,
      password: values.password,
      passwordConfirmation: values.passwordConfirmation,
    }),
  });
  return response.data.user;
}

export async function loginUser(values: LoginFormValues) {
  const response = await apiRequest<SessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(values),
  });
  return response.data.user;
}

export function logoutUser() {
  return apiRequest<void>("/auth/logout", { method: "POST" });
}

export function getCurrentUser() {
  return apiGetData<AuthUser>("/me");
}

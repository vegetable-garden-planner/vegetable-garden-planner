import assert from "node:assert/strict";
import test from "node:test";
import {
  getSafeReturnPath,
  getSocialLoginErrorMessage,
  getPasswordRequirements,
  isValidEmailAddress,
  passwordsMatch,
  validateLogin,
  validateSignup,
  type SignupFormValues,
} from "./auth.ts";

const validSignup: SignupFormValues = {
  email: " GARDENER@example.com ",
  nickname: " 새싹 ",
  password: "garden123",
  passwordConfirmation: "garden123",
  termsAccepted: true,
  privacyAccepted: true,
};

test("회원가입 이메일과 닉네임을 정규화한다", () => {
  const result = validateSignup(validSignup);
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.value.email, "gardener@example.com");
    assert.equal(result.value.nickname, "새싹");
  }
});

test("잘못된 이메일과 짧은 비밀번호를 거부한다", () => {
  const result = validateLogin({ email: "invalid", password: "short" });
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(result.errors.email);
    assert.ok(result.errors.password);
  }
});

test("비밀번호 불일치와 필수 동의 누락을 거부한다", () => {
  const result = validateSignup({
    ...validSignup,
    passwordConfirmation: "different123",
    termsAccepted: false,
    privacyAccepted: false,
  });
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(result.errors.passwordConfirmation);
    assert.ok(result.errors.termsAccepted);
    assert.ok(result.errors.privacyAccepted);
  }
});

test("회원가입 입력 상태를 필드별로 확인한다", () => {
  assert.equal(isValidEmailAddress("gardener@example.com"), true);
  assert.equal(isValidEmailAddress("gardener@"), false);
  assert.deepEqual(getPasswordRequirements("garden123"), {
    hasLetter: true,
    hasMinimumLength: true,
    hasNumber: true,
  });
  assert.deepEqual(getPasswordRequirements("한글비밀번호123"), {
    hasLetter: false,
    hasMinimumLength: true,
    hasNumber: true,
  });
  assert.equal(passwordsMatch("garden123", "garden123"), true);
  assert.equal(passwordsMatch("garden123", ""), false);
});

test("내부 복귀 경로만 허용한다", () => {
  assert.equal(getSafeReturnPath("/spaces/new?type=balcony"), "/spaces/new?type=balcony");
  assert.equal(getSafeReturnPath("https://example.com"), "/dashboard");
  assert.equal(getSafeReturnPath("//example.com"), "/dashboard");
  assert.equal(getSafeReturnPath("javascript:alert(1)"), "/dashboard");
  assert.equal(getSafeReturnPath("/\\example.com"), "/dashboard");
});

test("소셜 로그인 제공자별 실패 원인을 안내한다", () => {
  assert.match(getSocialLoginErrorMessage("google-config"), /설정/);
  assert.match(getSocialLoginErrorMessage("google"), /Google 로그인/);
  assert.match(getSocialLoginErrorMessage("kakao-config"), /설정/);
  assert.match(getSocialLoginErrorMessage("kakao"), /이메일 제공 동의/);
  assert.equal(getSocialLoginErrorMessage(["kakao"]), "");
  assert.equal(getSocialLoginErrorMessage(undefined), "");
});

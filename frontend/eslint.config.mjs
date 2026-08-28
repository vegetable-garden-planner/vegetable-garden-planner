import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      complexity: ["error", 25],
      "max-depth": ["error", 3],
      "max-lines-per-function": [
        "error",
        { max: 170, skipBlankLines: true, skipComments: true },
      ],
      "import/no-cycle": ["error", { ignoreExternal: true }],
    },
  },
  {
    // 랜딩 페이지의 GSAP·three.js 연출 코드는 한 장면을 타임라인 순서대로
    // 기술해야 해서 함수를 쪼개면 오히려 읽기 어려워진다. 길이 규칙만 완화하고
    // 계층·순환 의존 규칙은 그대로 적용한다.
    files: ["features/landing/**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      "max-lines-per-function": "off",
      // 미디어쿼리 구독과 latest-ref 패턴을 쓰는 애니메이션 훅에서만 해제한다.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    // 로컬 디자인 확인용 임시 mock 응답기. 경로 분기 나열이라 복잡도가 높지만
    // production 빌드에서는 404만 돌려주는 개발 전용 파일이다.
    files: ["app/api/dev-mock/**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      complexity: "off",
    },
  },
  {
    files: ["shared/**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "@/components/**", "@/features/**"],
              message: "shared 계층은 앱이나 기능 계층에 의존할 수 없습니다.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["features/*/domain/**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/**",
                "@/components/**",
                "@/features/*/components/**",
                "@/features/*/hooks/**",
                "@/features/*/infrastructure/**",
              ],
              message: "도메인 계층은 UI, 훅, 인프라 계층에 의존할 수 없습니다.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

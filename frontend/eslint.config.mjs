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

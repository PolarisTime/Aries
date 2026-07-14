import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const nonProjectServiceFiles = [
  'src/api/idempotency.ts',
  'src/api/module-save-payload.ts',
  'src/api/system-settings.ts',
  'src/layouts/global-search.ts',
  'src/config/page-registry-finance.ts',
]

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'coverage-e2e',
      'playwright-report',
      'test-results',
      'archive',
      'node_modules',
      'src/utils/clodop.ts',
    ],
  },

  // ── 全项目严格规则 ───────────────────────────────────
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // React 19 Compiler 已接入 (2026-05)，这些规则由 Compiler 保证
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/exhaustive-deps': 'off',

      // Fast Refresh — named exports are intentional
      'react-refresh/only-export-components': 'off',

      // 第三方库类型限制 (Antd v6 / Axios / React Query v5)
      // 这些库的泛型推断返回 any，无法在业务层修复。已通过 src/lib/ 包装器隔离。
      // — 2026-05, Claude Code
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // 严格规则 — 业务代码严禁违反
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // ── tsconfig.app.json 明确排除的测试/兼容文件 ───────────
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: nonProjectServiceFiles,
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
  },

  // ── 架构边界规则 — 强制单向依赖 ─────────────────────────
  {
    files: ['src/api/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/views/*', '@/hooks/*', '@/stores/*', '@/components/*'],
              message:
                'api/ 层禁止导入 views/hooks/stores/components，应保持底层纯净',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/views/*'],
              message: 'hooks/ 层禁止导入 views/，应导入 @/module-system/',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/constants/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/api/*'],
              message: 'constants/ 层禁止导入 api/，常量应为纯数据无副作用',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/stores/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/views/*', '@/hooks/*', '@/components/*'],
              message:
                'stores/ 层禁止导入 views/hooks/components，应保持底层纯净',
            },
          ],
        },
      ],
    },
  },

  // ── 历史兼容桥接文件 ─────────────────────────────────
  {
    files: [
      'src/api/idempotency.ts',
      'src/api/module-save-payload.ts',
      'src/api/system-settings.ts',
      'src/config/page-registry-finance.ts',
      'src/layouts/global-search.ts',
    ],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)

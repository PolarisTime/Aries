import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginReact from 'eslint-plugin-react'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'playwright-report/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    settings: {
      react: {
        version: '19.0',
      },
    },
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        AbortController: 'readonly',
        Blob: 'readonly',
        ClipboardEvent: 'readonly',
        DragEvent: 'readonly',
        Event: 'readonly',
        fetch: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        sessionStorage: 'readonly',
        localStorage: 'readonly',
        URL: 'readonly',
        clearTimeout: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['**/*.config.{ts,js}', 'vite.config.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
  },
  eslintConfigPrettier,
]

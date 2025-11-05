import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      parser: tsparser,
      globals: globals.node,
    },
    plugins: {
      js,
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      'no-console': 'warn',
      semi: ['error', 'always'],
      '@typescript-eslint/no-unused-vars': ['error'],
      '@typescript-eslint/ban-ts-comment': 'warn',
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      'no-var': 'error',
    },
  },
]);

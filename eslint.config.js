import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'test-results',
      'playwright-report',
      'src/series/f1/data/circuits/shapes',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    // Shared code and other series must not depend on F1: anything both need lives outside series/f1.
    files: [
      'src/series/wec/**/*.{ts,tsx}',
      'src/{api,hooks,lib}/**/*.{ts,tsx}',
      'src/components/{ui,DataState,SortableTable}.tsx',
    ],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Any relative path through an `f1` folder: '../series/f1/…' from shared code, '../../f1/…' from WEC.
              regex: String.raw`^\.{1,2}/(.*/)?f1(/|$)`,
              message: 'Общий код и WEC не импортируют F1.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
);

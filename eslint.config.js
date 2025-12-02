import * as config from '@lvce-editor/eslint-config'
import * as actions from '@lvce-editor/eslint-plugin-github-actions'

export default [
  ...config.default,
  ...actions.default,
  {
    ignores: [
      '**/build/**',
      '**/coverage/**',
      '**/server/**',
      '**/e2e/**',
      '**/.tmp/**',
      '**/memory/**',
      '**/extension-management-sub-worker/**',
      '**/test-integration/**',
      '**/test-integration-util/**',
      'dist',
      'coverage',
      'scripts',
      'rollup.config.js',
      'eslint.config.js',
      'packages/extension-management-worker/src/extensionManagementWorkerMain.ts',
    ],
  },
  {
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'unicorn/consistent-function-scoping': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'no-empty': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      'jest/no-restricted-jest-methods': 'off',
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      'github-actions/ci-versions': 'off',
    },
  },
]

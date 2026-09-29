import { defineConfig } from 'eslint/config'
import * as config from '@lvce-editor/eslint-config'

export default defineConfig([
  ...config.default,
  ...config.recommendedTsconfig,
  ...config.recommendedActions,
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'github-actions/ci-versions': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      'unicorn/consistent-json-file-read': 'off',
    },
  },
  {
    // The pinned application supplies its own Node runtime.
    files: ['.github/workflows/integration.yml'],
    rules: { 'github-actions/node-version-file': 'off', 'github-actions/on': 'off' },
  },
])

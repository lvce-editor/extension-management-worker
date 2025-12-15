import * as config from '@lvce-editor/eslint-config'
import * as actions from '@lvce-editor/eslint-plugin-github-actions'

export default [
  ...config.default,
  ...config.recommendedTsconfig,
  ...actions.default,
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'github-actions/ci-versions': 'off',
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
]

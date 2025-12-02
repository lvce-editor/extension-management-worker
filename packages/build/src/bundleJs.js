import pluginTypeScript from '@babel/preset-typescript'
import { babel } from '@rollup/plugin-babel'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { join } from 'path'
import { rollup } from 'rollup'
import { root } from './root.js'

export const bundleJs = async ({ inFile, outFile }) => {
  /**
   * @type {import('rollup').RollupOptions}
   */
  const options = {
    input: join(root, inFile),
    preserveEntrySignatures: 'strict',
    treeshake: {
      propertyReadSideEffects: false,
    },
    output: {
      file: join(root, outFile),
      format: 'es',
      freeze: false,
      generatedCode: {
        constBindings: true,
        objectShorthand: true,
      },
    },
    external: ['electron', 'ws'],
    plugins: [
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        presets: [pluginTypeScript],
      }),
      nodeResolve(),
    ],
  }
  const input = await rollup(options)
  // @ts-ignore
  await input.write(options.output)
}

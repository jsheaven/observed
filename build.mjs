import { buildForNode } from '@jsheaven/easybuild'

await buildForNode({
  entryPoint: './src/index.ts',
  outfile: './dist/index.js',
  esBuildOptions: {
    logLevel: 'error',
  },
})

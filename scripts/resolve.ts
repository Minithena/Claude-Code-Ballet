// The hooks import each other without extensions, as the engine and
// claude-toons do; plain Node needs the .ts spelled out, so it is tried here.
// Imported first by the preview scripts.

import { registerHooks } from 'node:module'

registerHooks({
  resolve: (spec, context, next) => {
    try {
      return next(spec, context)
    } catch (error) {
      if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(`${spec}.ts`, context)
      throw error
    }
  },
})

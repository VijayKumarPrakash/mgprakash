import { defineConfig } from 'vitest/config'

/**
 * `.mts` rather than `.ts`: the package is CommonJS (no `"type": "module"`), so
 * Vite's native config loader warns about ESM syntax in a file it loaded as
 * CJS. The extension states the module system instead of the project having to
 * change it — `"type": "module"` would alter how every other .js in the tree is
 * interpreted, which is a large change to make for a test config.
 *
 * Node environment only. Everything under test here is a pure function —
 * `lib/validation.ts` and `lib/format.ts` — so there is nothing to gain from
 * paying for jsdom. The components are covered by the type checker and the
 * build rather than by shallow render assertions.
 *
 * The alias mirrors `paths` in tsconfig.json: `lib/validation.ts` imports
 * `@/types`, so without it the suite cannot resolve the module under test.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': import.meta.dirname },
  },
})

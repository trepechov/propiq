import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignore build output and legacy Vite source (migrating to Next.js)
  globalIgnores(['dist', '.next', 'src']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Next.js App Router legitimately exports non-component values (metadata, config)
      // alongside default component exports. Allow constant exports to support this.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])

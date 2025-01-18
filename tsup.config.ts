import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'cli': 'src/tts-cli.ts'
  },
  splitting: false, // Disable code splitting for a simpler output
  sourcemap: true, // Generate sourcemaps for debugging
  clean: true, // Clean the output directory before each build
  dts: true, // Generate TypeScript declaration files (.d.ts)
  format: ['cjs', 'esm'], // Output both CommonJS and ESM formats
  outDir: 'dist', // Output directory
  external: ['ws', 'node-fetch', 'buffer'], // Mark these as external dependencies
  banner: {
    js: '#!/usr/bin/env node'
  }
});
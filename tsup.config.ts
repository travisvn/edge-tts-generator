import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/tts-cli.ts'], // CLI entry point
    format: ['cjs'],
    platform: 'node',
    target: 'node16',
    sourcemap: true,
    dts: false,
    splitting: false,
    bundle: true,
    outDir: 'dist',
    clean: true,
    esbuildOptions(options) {
      options.banner = {
        js: '#!/usr/bin/env node',
      };
    },
  },
  {
    entry: ['src/index.ts'], // Library entry point
    format: ['cjs', 'esm'], // Output both CommonJS and ES Modules
    sourcemap: true,
    dts: true, // Generate declaration files for the library
    splitting: false,
    bundle: true,
    outDir: 'dist',
    // If you want to exclude 'ws' and 'node-fetch' from the library bundle, uncomment this:
    // external: ['ws', 'node-fetch'],
  },
]);
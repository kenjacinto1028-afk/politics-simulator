/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // relative paths so the build works from any folder or host
  // Long random-play tests take ~5s locally and longer on shared CI machines.
  test: { testTimeout: 60_000 },
})

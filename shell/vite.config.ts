import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'ShellPlatform',
      fileName: 'shell-platform'
    },
    rollupOptions: {
      // External deps that shouldn't be bundled
      external: ['lit', 'rxjs'],
      output: {
        globals: {
          lit: 'lit',
          rxjs: 'rxjs'
        }
      }
    }
  },
  server: {
    port: 8888,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});

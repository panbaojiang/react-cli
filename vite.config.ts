import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            'import',
            {
              libraryName: 'antd',
              libraryDirectory: 'es',
              style: 'css', // 引入 CSS（默认）
              // style: true, // 如果要自定义主题，使用 Less
            },
          ],
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    open: true,
  },
})

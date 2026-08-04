import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
      // 图片备注等上传文件由后端 wwwroot 静态服务提供
      "/uploads": "http://localhost:5000",
    },
  },
})

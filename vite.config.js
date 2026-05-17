import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 외부(핸드폰 등)에서 로컬 IP로 접속할 수 있도록 허용합니다.
  }
})

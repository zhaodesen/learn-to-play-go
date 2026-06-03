import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 部署目标是 GitHub Pages 项目站点:https://zhaodesen.github.io/learn-to-play-go/
// 生产构建需要把仓库名作为 base,资源路径才正确;本地开发仍用根路径 "/"。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/learn-to-play-go/' : '/',
  plugins: [react()],
}))

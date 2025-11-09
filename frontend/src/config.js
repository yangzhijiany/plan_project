// API 配置
// 在开发环境中使用 localhost，在生产环境中使用环境变量
const getApiBaseUrl = () => {
  // Vite 使用 import.meta.env 来访问环境变量
  // 生产环境变量需要以 VITE_ 开头
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // 开发环境默认使用 localhost
  if (import.meta.env.MODE === 'development' || import.meta.env.DEV) {
    return 'http://localhost:8000'
  }
  
  // 生产环境：如果前后端部署在同一域名下，使用相对路径（空字符串）
  // 这样 API 请求会发送到同一个域名
  return ''
}

export const API_BASE_URL = getApiBaseUrl()


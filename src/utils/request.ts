// src/utils/http.ts
import { message } from 'antd'
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type Canceler,
  type InternalAxiosRequestConfig,
} from 'axios'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    showLoading?: boolean
  }
}

// 响应数据格式
export interface ResponseData<T = any> {
  code: number
  data: T
  message: string
  success: boolean
}

// 请求取消存储
const pendingRequests = new Map<string, Canceler>()

class HttpClient {
  private instance: AxiosInstance
  private loadingCount = 0

  constructor(config: AxiosRequestConfig) {
    this.instance = axios.create(config)
    this.setupInterceptors()
  }

  // 生成请求唯一标识
  private generateRequestKey(config: InternalAxiosRequestConfig): string {
    return [
      config.method?.toUpperCase(),
      config.url,
      JSON.stringify(config.params),
      JSON.stringify(config.data),
    ].join('&')
  }

  // 拦截器配置
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 显示加载状态
        if (config.showLoading !== false) {
          this.showLoading()
        }

        // 生成请求标识
        const requestKey = this.generateRequestKey(config)

        // 取消重复请求
        if (pendingRequests.has(requestKey)) {
          const cancel = pendingRequests.get(requestKey)!
          cancel('取消重复请求')
          pendingRequests.delete(requestKey)
        }

        // 添加取消令牌
        config.cancelToken = new axios.CancelToken((cancel) => {
          pendingRequests.set(requestKey, cancel)
        })

        return config
      },
      (error: AxiosError) => {
        this.hideLoading()
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ResponseData>) => {
        const config = response.config as InternalAxiosRequestConfig

        // 隐藏加载状态
        if (config.showLoading !== false) {
          this.hideLoading()
        }

        // 移除已完成的请求
        const requestKey = this.generateRequestKey(config)
        pendingRequests.delete(requestKey)

        // 处理业务错误
        if (!response.data.success) {
          message.error(response.data.message || '请求失败')
          return Promise.reject(response.data)
        }

        return response.data.data
      },
      (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig
        const { response } = error
        // 隐藏加载状态
        if (config.showLoading !== false) {
          this.hideLoading()
        }

        // 处理请求取消
        if (axios.isCancel(error)) {
          // console.log('请求已取消:', error.message)
          return Promise.reject({ isCancel: true, message: error.message })
        }

        // 处理网络错误
        if (!response) {
          message.error('网络连接失败，请检查网络')
          return Promise.reject(error)
        }

        // 处理HTTP状态码
        switch (response.status) {
          case 401:
            message.error('登录已过期，请重新登录')
            // 这里可以添加跳转登录逻辑
            break
          case 403:
            message.error('无权访问')
            break
          case 404:
            message.error('资源不存在')
            break
          case 500:
            message.error('服务器错误')
            break
          default:
            message.error('请求失败，未知错误请联系管理员')
        }

        return Promise.reject(error)
      }
    )
  }

  // 显示加载状态
  private showLoading() {
    this.loadingCount++
    if (this.loadingCount === 1) {
      message.loading('加载中...', 0)
    }
  }

  // 隐藏加载状态
  private hideLoading() {
    this.loadingCount--
    if (this.loadingCount <= 0) {
      this.loadingCount = 0
      message.destroy()
    }
  }

  // 取消所有请求
  public cancelAllRequests() {
    pendingRequests.forEach((cancel) => cancel('取消所有请求'))
    pendingRequests.clear()
  }

  // 基础请求方法
  public request<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.instance.request(config)
  }

  // GET请求
  public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get(url, config)
  }

  // POST请求
  public post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.instance.post(url, data, config)
  }

  // PUT请求
  public put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.instance.put(url, data, config)
  }

  // DELETE请求
  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config)
  }

  // 文件上传
  public upload<T = any>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.instance.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    })
  }

  // 文件下载
  public download(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<{ filename: string; data: Blob }> {
    return this.instance
      .get(url, {
        ...config,
        responseType: 'blob',
      })
      .then((response) => {
        const contentDisposition = response.headers['content-disposition']
        let filename = 'download'
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(
            /filename="?(.+?)"?(;|$)/
          )
          if (filenameMatch?.[1]) {
            filename = filenameMatch[1]
          }
        }
        return { filename, data: response.data }
      })
  }
}

// 创建实例
const http = new HttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  withCredentials: true,
})
export default http

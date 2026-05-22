import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'

// vi.hoisted permite declarar variables antes del hoisting de vi.mock
const { mockSetAccessToken, mockClearAuth, mockGetState } = vi.hoisted(() => ({
  mockSetAccessToken: vi.fn(),
  mockClearAuth: vi.fn(),
  mockGetState: vi.fn(),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: {
    getState: mockGetState,
  },
}))

import axios from 'axios'
import { apiClient } from './client'

function getRequestInterceptor() {
  const handlers = (apiClient.interceptors.request as any).handlers
  return handlers.find((h: any) => h !== null)
}

function getResponseInterceptor() {
  const handlers = (apiClient.interceptors.response as any).handlers
  return handlers.find((h: any) => h !== null)
}

describe('apiClient — request interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetState.mockReturnValue({
      accessToken: null,
      setAccessToken: mockSetAccessToken,
      clearAuth: mockClearAuth,
    })
  })

  it('agrega Authorization: Bearer cuando hay accessToken', () => {
    mockGetState.mockReturnValue({ accessToken: 'token-123', setAccessToken: mockSetAccessToken, clearAuth: mockClearAuth })
    const interceptor = getRequestInterceptor()
    const config = { headers: {} } as InternalAxiosRequestConfig
    const result = interceptor.fulfilled(config)
    expect(result.headers.Authorization).toBe('Bearer token-123')
  })

  it('no agrega Authorization cuando accessToken es null', () => {
    const interceptor = getRequestInterceptor()
    const config = { headers: {} } as InternalAxiosRequestConfig
    const result = interceptor.fulfilled(config)
    expect(result.headers.Authorization).toBeUndefined()
  })

  it('preserva los headers existentes si no hay token', () => {
    const interceptor = getRequestInterceptor()
    const config = { headers: { 'Content-Type': 'application/json' } } as InternalAxiosRequestConfig
    const result = interceptor.fulfilled(config)
    expect(result.headers['Content-Type']).toBe('application/json')
  })
})

describe('apiClient — response interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetState.mockReturnValue({
      accessToken: 'old-token',
      setAccessToken: mockSetAccessToken,
      clearAuth: mockClearAuth,
    })
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deja pasar las respuestas exitosas sin modificarlas', async () => {
    const interceptor = getResponseInterceptor()
    const response = { status: 200, data: { ok: true } }
    const result = await interceptor.fulfilled(response)
    expect(result).toEqual(response)
  })

  it('propaga errores que no son 401', async () => {
    const interceptor = getResponseInterceptor()
    const error = { response: { status: 500 }, config: { _retry: false } }
    await expect(interceptor.rejected(error)).rejects.toEqual(error)
  })

  it('propaga el error 401 si el config ya tiene _retry=true (evita bucle infinito)', async () => {
    const interceptor = getResponseInterceptor()
    const error = { response: { status: 401 }, config: { _retry: true, headers: {} } }
    await expect(interceptor.rejected(error)).rejects.toEqual(error)
  })

  it('en 401 llama axios.post al endpoint de refresh', async () => {
    const axiosPost = vi.spyOn(axios, 'post').mockResolvedValueOnce({ data: { accessToken: 'new-token' } })
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce({ data: 'retried' } as any)

    const interceptor = getResponseInterceptor()
    await interceptor.rejected({ response: { status: 401 }, config: { _retry: false, headers: {} } })

    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      {},
      expect.objectContaining({ withCredentials: true }),
    )
  })

  it('en 401 con refresh exitoso llama setAccessToken con el nuevo token', async () => {
    vi.spyOn(axios, 'post').mockResolvedValueOnce({ data: { accessToken: 'new-token' } })
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce({ data: 'retried' } as any)

    const interceptor = getResponseInterceptor()
    await interceptor.rejected({ response: { status: 401 }, config: { _retry: false, headers: {} } })

    expect(mockSetAccessToken).toHaveBeenCalledWith('new-token')
  })

  it('en 401 con refresh fallido llama clearAuth y redirige a /login', async () => {
    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('refresh failed'))

    const interceptor = getResponseInterceptor()
    const error = { response: { status: 401 }, config: { _retry: false, headers: {} } }

    await expect(interceptor.rejected(error)).rejects.toBeDefined()

    expect(mockClearAuth).toHaveBeenCalled()
    expect(window.location.href).toBe('/login')
  })
})

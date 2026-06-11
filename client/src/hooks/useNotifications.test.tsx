import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '@/store/authStore'

const { mockIo } = vi.hoisted(() => ({ mockIo: vi.fn() }))

vi.mock('socket.io-client', () => ({ io: mockIo }))

import { useNotifications } from './useNotifications'

type EventHandlers = Record<string, (...args: unknown[]) => void>

function makeMockSocket() {
  const handlers: EventHandlers = {}
  const socket = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    _trigger: (event: string, ...args: unknown[]) => handlers[event]?.(...args),
  }
  return socket
}

let mockSocket: ReturnType<typeof makeMockSocket>

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useAuthStore.setState({ user: null, accessToken: null })
  mockSocket = makeMockSocket()
  mockIo.mockReturnValue(mockSocket)
})

describe('useNotifications — conexión', () => {
  it('no conecta socket si no hay accessToken', () => {
    renderHook(() => useNotifications())
    expect(mockIo).not.toHaveBeenCalled()
  })

  it('conecta socket cuando hay accessToken', () => {
    useAuthStore.setState({ accessToken: 'tok-123' })
    renderHook(() => useNotifications())
    expect(mockIo).toHaveBeenCalledWith('/', expect.objectContaining({
      auth: { token: 'tok-123' },
    }))
  })

  it('desconecta al desmontar', () => {
    useAuthStore.setState({ accessToken: 'tok-123' })
    const { unmount } = renderHook(() => useNotifications())
    unmount()
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
  })

  it('se reconecta cuando cambia el accessToken', () => {
    useAuthStore.setState({ accessToken: 'tok-1' })
    renderHook(() => useNotifications())
    expect(mockIo).toHaveBeenCalledTimes(1)

    const mockSocket2 = makeMockSocket()
    mockIo.mockReturnValue(mockSocket2)

    act(() => { useAuthStore.setState({ accessToken: 'tok-2' }) })

    expect(mockIo).toHaveBeenCalledTimes(2)
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
  })
})

describe('useNotifications — listeners', () => {
  it('registra "request:update" si se pasa onRequestUpdate', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    const onUpdate = vi.fn()
    renderHook(() => useNotifications({ onRequestUpdate: onUpdate }))
    expect(mockSocket.on).toHaveBeenCalledWith('request:update', onUpdate)
  })

  it('registra "request:new" si se pasa onRequestNew', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    const onNew = vi.fn()
    renderHook(() => useNotifications({ onRequestNew: onNew }))
    expect(mockSocket.on).toHaveBeenCalledWith('request:new', onNew)
  })

  it('no registra "request:update" si no se pasa el callback', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    renderHook(() => useNotifications({ onRequestNew: vi.fn() }))
    const calls = mockSocket.on.mock.calls.map(([event]: [string]) => event)
    expect(calls).not.toContain('request:update')
  })

  it('llama onRequestUpdate con el payload al recibir "request:update"', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    const onUpdate = vi.fn()
    renderHook(() => useNotifications({ onRequestUpdate: onUpdate }))

    const payload = { requestId: 'r1', tripId: 't1', status: 'ACCEPTED' as const, rejectionCount: 0 }
    act(() => { mockSocket._trigger('request:update', payload) })

    expect(onUpdate).toHaveBeenCalledWith(payload)
  })

  it('llama onRequestNew con el payload al recibir "request:new"', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    const onNew = vi.fn()
    renderHook(() => useNotifications({ onRequestNew: onNew }))

    const payload = { requestId: 'r2', tripId: 't2', passengerName: 'Ana' }
    act(() => { mockSocket._trigger('request:new', payload) })

    expect(onNew).toHaveBeenCalledWith(payload)
  })
})

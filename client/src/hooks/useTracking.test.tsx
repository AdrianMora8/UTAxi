import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '@/store/authStore'

const { mockIo } = vi.hoisted(() => ({ mockIo: vi.fn() }))

vi.mock('socket.io-client', () => ({ io: mockIo }))

import { useTracking } from './useTracking'

type EventHandlers = Record<string, (...args: unknown[]) => void>

function makeMockSocket() {
  const handlers: EventHandlers = {}
  const socket = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    _trigger: (event: string, ...args: unknown[]) => handlers[event]?.(...args),
  }
  return socket
}

let mockSocket: ReturnType<typeof makeMockSocket>
const mockWatchPosition = vi.fn()
const mockClearWatch = vi.fn()

beforeAll(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: { watchPosition: mockWatchPosition, clearWatch: mockClearWatch },
    configurable: true,
    writable: true,
  })
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useAuthStore.setState({ user: null, accessToken: null })
  mockSocket = makeMockSocket()
  mockIo.mockReturnValue(mockSocket)
})

describe('useTracking — conexión', () => {
  it('no conecta si no hay accessToken', () => {
    renderHook(() => useTracking({ tripId: 'trip-1', isDriver: false }))
    expect(mockIo).not.toHaveBeenCalled()
  })

  it('no conecta si tripId está vacío', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    renderHook(() => useTracking({ tripId: '', isDriver: false }))
    expect(mockIo).not.toHaveBeenCalled()
  })

  it('conecta socket con el token cuando hay accessToken y tripId', () => {
    useAuthStore.setState({ accessToken: 'tok-abc' })
    renderHook(() => useTracking({ tripId: 'trip-1', isDriver: false }))
    expect(mockIo).toHaveBeenCalledWith('/', expect.objectContaining({
      auth: { token: 'tok-abc' },
    }))
  })

  it('emite "join:trip" con el tripId al conectar', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    renderHook(() => useTracking({ tripId: 'trip-99', isDriver: false }))
    act(() => { mockSocket._trigger('connect') })
    expect(mockSocket.emit).toHaveBeenCalledWith('join:trip', { tripId: 'trip-99' })
  })

  it('emite "leave:trip" y desconecta al desmontar', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    const { unmount } = renderHook(() => useTracking({ tripId: 'trip-1', isDriver: false }))
    unmount()
    expect(mockSocket.emit).toHaveBeenCalledWith('leave:trip', { tripId: 'trip-1' })
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
  })
})

describe('useTracking — estado reactivo', () => {
  it('connected pasa a true al recibir "connect"', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    const { result } = renderHook(() => useTracking({ tripId: 'trip-1', isDriver: false }))
    expect(result.current.connected).toBe(false)
    act(() => { mockSocket._trigger('connect') })
    expect(result.current.connected).toBe(true)
  })

  it('connected pasa a false al recibir "disconnect"', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    const { result } = renderHook(() => useTracking({ tripId: 'trip-1', isDriver: false }))
    act(() => { mockSocket._trigger('connect') })
    act(() => { mockSocket._trigger('disconnect') })
    expect(result.current.connected).toBe(false)
  })

  it('error se actualiza al recibir "connect_error"', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    const { result } = renderHook(() => useTracking({ tripId: 'trip-1', isDriver: false }))
    act(() => { mockSocket._trigger('connect_error', { message: 'timeout' }) })
    expect(result.current.error).toContain('timeout')
  })
})

describe('useTracking — pasajero', () => {
  it('actualiza driverLocation al recibir "location:update"', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    const { result } = renderHook(() => useTracking({ tripId: 'trip-1', isDriver: false }))

    const location = { lat: -1.25, lng: -78.62, timestamp: 1000, driverId: 'd1' }
    act(() => { mockSocket._trigger('location:update', location) })

    expect(result.current.driverLocation).toEqual(location)
  })

  it('no registra "location:update" cuando es conductor', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    renderHook(() => useTracking({ tripId: 'trip-1', isDriver: true }))
    const registeredEvents = mockSocket.on.mock.calls.map(([event]: [string]) => event)
    expect(registeredEvents).not.toContain('location:update')
  })
})

describe('useTracking — conductor GPS', () => {
  it('inicia watchPosition cuando es conductor y connected=true', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    mockWatchPosition.mockReturnValue(42)
    renderHook(() => useTracking({ tripId: 'trip-1', isDriver: true }))
    act(() => { mockSocket._trigger('connect') })
    expect(mockWatchPosition).toHaveBeenCalledTimes(1)
  })

  it('emite "location:update" con lat/lng desde geolocation', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    mockSocket.connected = true
    mockWatchPosition.mockImplementation((success: (pos: unknown) => void) => {
      success({ coords: { latitude: -1.254, longitude: -78.62 } })
      return 10
    })
    renderHook(() => useTracking({ tripId: 'trip-1', isDriver: true }))
    act(() => { mockSocket._trigger('connect') })
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'location:update',
      expect.objectContaining({ tripId: 'trip-1', lat: -1.254, lng: -78.62 }),
    )
  })

  it('llama clearWatch al desmontar cuando era conductor', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    mockWatchPosition.mockReturnValue(99)
    const { unmount } = renderHook(() => useTracking({ tripId: 'trip-1', isDriver: true }))
    act(() => { mockSocket._trigger('connect') })
    unmount()
    expect(mockClearWatch).toHaveBeenCalledWith(99)
  })

  it('setea error si geolocation no está disponible', () => {
    useAuthStore.setState({ accessToken: 'tok' })
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    const { result } = renderHook(() => useTracking({ tripId: 'trip-1', isDriver: true }))
    act(() => { mockSocket._trigger('connect') })
    expect(result.current.error).toContain('Geolocalización no disponible')

    // Restaurar para los demás tests
    Object.defineProperty(navigator, 'geolocation', {
      value: { watchPosition: mockWatchPosition, clearWatch: mockClearWatch },
      configurable: true,
      writable: true,
    })
  })
})

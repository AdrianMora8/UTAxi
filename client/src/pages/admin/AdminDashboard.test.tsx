import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const {
  mockGetStats, mockGetReports, mockGetUsers, mockGetTrips, mockGetEvents,
  mockReviewReport, mockUpdateUserStatus, mockCancelTrip, mockGetUserDetail,
  mockNavigate,
} = vi.hoisted(() => ({
  mockGetStats: vi.fn(),
  mockGetReports: vi.fn(),
  mockGetUsers: vi.fn(),
  mockGetTrips: vi.fn(),
  mockGetEvents: vi.fn(),
  mockReviewReport: vi.fn(),
  mockUpdateUserStatus: vi.fn(),
  mockCancelTrip: vi.fn(),
  mockGetUserDetail: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/api/admin.api', () => ({
  adminApi: {
    getStats: mockGetStats,
    getReports: mockGetReports,
    getUsers: mockGetUsers,
    getTrips: mockGetTrips,
    getEvents: mockGetEvents,
    reviewReport: mockReviewReport,
    updateUserStatus: mockUpdateUserStatus,
    cancelTrip: mockCancelTrip,
    getUserDetail: mockGetUserDetail,
  },
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      user: { id: 'admin-1', fullName: 'Admin User', email: 'admin@uta.edu.ec' },
      clearAuth: vi.fn(),
    }),
  ),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import AdminDashboard from './AdminDashboard'

const mockStats = {
  reports: { open: 3, total: 10 },
  users: { active: 42, total: 50, suspended: 2 },
  trips: { completed: 100, active: 5, cancelled: 3 },
  avgReputation: 4.5,
  revenue: 200.0,
}

const makeReport = (overrides: Record<string, unknown> = {}) => ({
  id: 'report-1',
  reason: 'FRAUD',
  description: 'El usuario realizó un pago fraudulento',
  status: 'OPEN',
  createdAt: '2026-06-01T10:00:00Z',
  reporter: { id: 'u1', fullName: 'Luis García', email: 'luis@uta.edu.ec' },
  reported: { id: 'u2', fullName: 'Ana López', email: 'ana@uta.edu.ec', status: 'ACTIVE' },
  ...overrides,
})

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  fullName: 'Carlos Vera',
  email: 'carlos@uta.edu.ec',
  status: 'ACTIVE',
  role: 'STUDENT',
  reputationScore: 4.2,
  createdAt: '2026-01-01T00:00:00Z',
  _count: { reportsReceived: 0, reportsFiled: 0 },
  ...overrides,
})

const makeTrip = (overrides: Record<string, unknown> = {}) => ({
  id: 'trip-1',
  originZone: 'Campus Huachi',
  destinationZone: 'Centro',
  departureTime: '2026-06-01T08:00:00Z',
  status: 'SCHEDULED',
  pricePerSeat: 1.5,
  totalSeats: 4,
  availableSeats: 2,
  driver: { id: 'd1', fullName: 'Pedro Rodríguez', email: 'pedro@uta.edu.ec' },
  _count: { requests: 2 },
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetStats.mockResolvedValue({ data: mockStats })
  mockGetReports.mockResolvedValue({ data: { reports: [], total: 0 } })
  mockGetUsers.mockResolvedValue({ data: { users: [], total: 0 } })
  mockGetTrips.mockResolvedValue({ data: { trips: [], total: 0 } })
  mockGetEvents.mockResolvedValue({ data: { events: [], total: 0 } })
  mockReviewReport.mockResolvedValue({})
  mockUpdateUserStatus.mockResolvedValue({})
  mockCancelTrip.mockResolvedValue({})
  mockGetUserDetail.mockResolvedValue({ data: { user: null } })
})

// ─── Layout & Stats ───────────────────────────────────────────────────────────

describe('AdminDashboard — layout y estadísticas', () => {
  it('renderiza el encabezado Dashboard Admin', async () => {
    render(<AdminDashboard />)
    await waitFor(() =>
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    )
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('muestra los tabs de navegación en el sidebar', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reportes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Usuarios/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Viajes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Trazabilidad/i })).toBeInTheDocument()
    })
  })

  it('muestra las 4 stat cards con datos del servidor', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      // open reports — "3" appears in sidebar badge too, so use getAllByText
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('42')).toBeInTheDocument()  // active users
      expect(screen.getByText('100')).toBeInTheDocument() // completed trips
      expect(screen.getByText('4.5★')).toBeInTheDocument()
    })
  })

  it('muestra skeletons de carga en stat cards mientras cargan', () => {
    mockGetStats.mockReturnValue(new Promise(() => {}))
    render(<AdminDashboard />)
    // when loading, StatCard renders skeleton divs instead of values
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(4)
  })

  it('muestra el nombre del admin en el sidebar', async () => {
    render(<AdminDashboard />)
    await waitFor(() =>
      expect(screen.getByText('Admin User')).toBeInTheDocument()
    )
  })
})

// ─── Tab: Reports ─────────────────────────────────────────────────────────────

describe('AdminDashboard — tab Reportes', () => {
  it('muestra el estado vacío cuando no hay reportes', async () => {
    mockGetReports.mockResolvedValue({ data: { reports: [], total: 0 } })
    render(<AdminDashboard />)
    await waitFor(() =>
      expect(screen.getByText('No hay reportes pendientes.')).toBeInTheDocument()
    )
  })

  it('renderiza la lista de reportes', async () => {
    mockGetReports.mockResolvedValue({ data: { reports: [makeReport()], total: 1 } })
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Ana López')).toBeInTheDocument()
      expect(screen.getByText('Luis García')).toBeInTheDocument()
    })
  })

  it('muestra el filtro de estado de reportes en el header', async () => {
    render(<AdminDashboard />)
    await waitFor(() =>
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    )
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('')
  })

  it('cambia el filtro y vuelve a cargar reportes con el estado seleccionado', async () => {
    const user = userEvent.setup()
    mockGetReports.mockResolvedValue({ data: { reports: [], total: 0 } })
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())

    await user.selectOptions(screen.getByRole('combobox'), 'OPEN')

    await waitFor(() =>
      expect(mockGetReports).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'OPEN' }),
      )
    )
  })

  it('muestra el botón "Review" para cada reporte', async () => {
    mockGetReports.mockResolvedValue({ data: { reports: [makeReport()], total: 1 } })
    render(<AdminDashboard />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument()
    )
  })

  it('abre el ReviewModal al hacer clic en Review', async () => {
    const user = userEvent.setup()
    mockGetReports.mockResolvedValue({ data: { reports: [makeReport()], total: 1 } })
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Review' }))

    await waitFor(() =>
      expect(screen.getByText('Revisar Reporte')).toBeInTheDocument()
    )
  })
})

// ─── ReviewModal ──────────────────────────────────────────────────────────────

describe('AdminDashboard — ReviewModal', () => {
  async function openReviewModal() {
    const user = userEvent.setup()
    mockGetReports.mockResolvedValue({ data: { reports: [makeReport()], total: 1 } })
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Review' }))
    await waitFor(() => expect(screen.getByText('Revisar Reporte')).toBeInTheDocument())
    return user
  }

  it('muestra las 3 opciones de acción: Advertir, Suspender, Desestimar', async () => {
    await openReviewModal()
    expect(screen.getByRole('button', { name: /Advertir/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Suspender/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Desestimar/i })).toBeInTheDocument()
  })

  it('llama a reviewReport con action WARNED al confirmar', async () => {
    const user = await openReviewModal()
    await user.click(screen.getByRole('button', { name: /Confirmar Acción/i }))

    await waitFor(() =>
      expect(mockReviewReport).toHaveBeenCalledWith(
        'report-1',
        expect.objectContaining({ action: 'WARNED' }),
      )
    )
  })

  it('llama a reviewReport con action SUSPENDED al seleccionar Suspender', async () => {
    const user = await openReviewModal()
    await user.click(screen.getByRole('button', { name: /Suspender/i }))
    await user.click(screen.getByRole('button', { name: /Confirmar Acción/i }))

    await waitFor(() =>
      expect(mockReviewReport).toHaveBeenCalledWith(
        'report-1',
        expect.objectContaining({ action: 'SUSPENDED' }),
      )
    )
  })

  it('llama a reviewReport con action DISMISSED al seleccionar Desestimar', async () => {
    const user = await openReviewModal()
    await user.click(screen.getByRole('button', { name: /Desestimar/i }))
    await user.click(screen.getByRole('button', { name: /Confirmar Acción/i }))

    await waitFor(() =>
      expect(mockReviewReport).toHaveBeenCalledWith(
        'report-1',
        expect.objectContaining({ action: 'DISMISSED' }),
      )
    )
  })

  it('cierra el modal al hacer clic en Cerrar Sesión (backdrop click)', async () => {
    const user = await openReviewModal()
    // Click on the overlay backdrop (the modal container div)
    await user.keyboard('{Escape}')
    // The modal remains because it has no Escape handler — close via backdrop click
    // Use the heading's parent container approach:
    const heading = screen.getByText('Revisar Reporte')
    const panel = heading.closest('.w-full.max-w-md')!
    const backdrop = panel.parentElement!
    await user.click(backdrop)

    await waitFor(() =>
      expect(screen.queryByText('Revisar Reporte')).not.toBeInTheDocument()
    )
  })
})

// ─── Tab: Usuarios ────────────────────────────────────────────────────────────

describe('AdminDashboard — tab Usuarios', () => {
  it('carga la lista de usuarios al cambiar a tab Usuarios', async () => {
    const user = userEvent.setup()
    mockGetUsers.mockResolvedValue({ data: { users: [makeUser()], total: 1 } })
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Usuarios/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Usuarios/i }))

    await waitFor(() =>
      expect(screen.getByText('Carlos Vera')).toBeInTheDocument()
    )
  })

  it('muestra el input de búsqueda en el header cuando tab=users', async () => {
    const user = userEvent.setup()
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Usuarios/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Usuarios/i }))

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Buscar usuario...')).toBeInTheDocument()
    )
  })
})

// ─── Tab: Viajes ──────────────────────────────────────────────────────────────

describe('AdminDashboard — tab Viajes', () => {
  it('carga la lista de viajes al cambiar a tab Viajes', async () => {
    const user = userEvent.setup()
    mockGetTrips.mockResolvedValue({ data: { trips: [makeTrip()], total: 1 } })
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Viajes/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Viajes/i }))

    await waitFor(() =>
      expect(screen.getByText('Campus Huachi')).toBeInTheDocument()
    )
  })

  it('muestra el selector de estado de viaje en el header cuando tab=trips', async () => {
    const user = userEvent.setup()
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Viajes/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Viajes/i }))

    await waitFor(() => {
      const select = screen.getByRole('combobox')
      expect(select).toHaveValue('')
    })
  })
})

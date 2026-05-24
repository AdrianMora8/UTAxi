import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type AdminReport, type AdminUser, type AdminUserDetail, type AdminTrip, type TripEvent, type TripEventType } from '@/api/admin.api'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

type Tab = 'reports' | 'users' | 'trips' | 'events'

const REPORT_STATUS: Record<string, { label: string; className: string }> = {
  OPEN:     { label: 'ABIERTO',  className: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' },
  REVIEWED: { label: 'REVISADO', className: 'bg-tertiary/10 text-tertiary border border-tertiary/20' },
  RESOLVED: { label: 'RESUELTO', className: 'bg-secondary/10 text-secondary border border-secondary/20' },
}

const USER_STATUS: Record<string, { label: string; className: string }> = {
  ACTIVE:    { label: 'ACTIVO',     className: 'bg-primary/10 text-primary border border-primary/20' },
  WARNED:    { label: 'ADVERTIDO',  className: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' },
  SUSPENDED: { label: 'SUSPENDIDO', className: 'bg-error/10 text-error border border-error/20' },
}

const REASON_LABEL: Record<string, string> = {
  INAPPROPRIATE_BEHAVIOR: 'Comportamiento inapropiado',
  NO_SHOW: 'No se presentó',
  FRAUD: 'Fraude / pago',
  UNSAFE_DRIVING: 'Conducción peligrosa',
  HARASSMENT: 'Hostigamiento',
  OTHER: 'Otro',
}

const EVENT_META: Record<TripEventType, { label: string; icon: string; color: string }> = {
  TRIP_PUBLISHED:       { label: 'Viaje publicado',    icon: 'add_circle',       color: 'text-primary' },
  TRIP_STARTED:         { label: 'Viaje iniciado',     icon: 'play_circle',      color: 'text-tertiary' },
  TRIP_COMPLETED:       { label: 'Viaje completado',   icon: 'check_circle',     color: 'text-tertiary' },
  TRIP_CANCELLED:       { label: 'Viaje cancelado',    icon: 'cancel',           color: 'text-error' },
  TRIP_SCHEDULE_CHANGED:{ label: 'Horario cambiado',   icon: 'schedule',         color: 'text-yellow-400' },
  REQUEST_SENT:         { label: 'Solicitud enviada',  icon: 'send',             color: 'text-secondary' },
  REQUEST_ACCEPTED:     { label: 'Solicitud aceptada', icon: 'check',            color: 'text-primary' },
  REQUEST_REJECTED:     { label: 'Solicitud rechazada',icon: 'close',            color: 'text-error' },
  REQUEST_CANCELLED:    { label: 'Solicitud cancelada',icon: 'cancel',           color: 'text-zinc-400' },
  PASSENGER_NO_SHOW:    { label: 'No se presentó',     icon: 'person_off',       color: 'text-error' },
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function ReviewModal({ report, onClose }: { report: AdminReport; onClose: () => void }) {
  const [action, setAction] = useState<'WARNED' | 'SUSPENDED' | 'DISMISSED'>('WARNED')
  const [notes, setNotes] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => adminApi.reviewReport(report.id, { action, notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reports'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      onClose()
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-surface-container-low rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="font-headline text-lg font-bold text-white">Revisar Reporte</h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Reportado: <span className="text-white font-bold">{report.reported.fullName}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Motivo</p>
            <p className="text-sm text-white">{REASON_LABEL[report.reason] ?? report.reason}</p>
          </div>

          {report.description && (
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Descripción</p>
              <p className="text-sm text-on-surface-variant leading-relaxed">{report.description}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Acción</p>
            <div className="grid grid-cols-3 gap-2">
              {(['WARNED', 'SUSPENDED', 'DISMISSED'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                    action === a
                      ? a === 'SUSPENDED'
                        ? 'bg-error/20 border-error/40 text-error'
                        : a === 'WARNED'
                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                        : 'bg-zinc-700/40 border-zinc-600 text-zinc-400'
                      : 'border-white/5 text-on-surface-variant hover:border-white/20'
                  }`}
                >
                  {a === 'WARNED' ? 'Advertir' : a === 'SUSPENDED' ? 'Suspender' : 'Desestimar'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Notas internas</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Observaciones del administrador (opcional)"
              className="w-full bg-surface-container-highest border-none rounded-xl p-3 text-on-surface placeholder:text-outline text-sm resize-none focus:ring-1 focus:ring-primary/40 outline-none"
            />
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full bg-gradient-primary py-3 rounded-xl text-on-primary font-headline font-bold uppercase tracking-wider disabled:opacity-50 transition-all"
          >
            {mutation.isPending ? 'Procesando...' : 'Confirmar Acción'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Suspend Modal ──────────────────────────────────────────────────
function SuspendModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [until, setUntil] = useState('')
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateUserStatus(user.id, 'SUSPENDED', until ? new Date(until).toISOString() : undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      onClose()
    },
  })

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-surface-container-low rounded-2xl shadow-2xl p-6">
        <h2 className="font-headline text-lg font-bold text-white mb-1">Suspender Usuario</h2>
        <p className="text-xs text-on-surface-variant mb-5">
          Suspendiendo a <span className="text-white font-bold">{user.fullName}</span>
        </p>

        <div className="space-y-3 mb-6">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block">
            Suspender hasta (opcional — dejar vacío = indefinido)
          </label>
          <input
            type="date"
            value={until}
            min={today}
            onChange={(e) => setUntil(e.target.value)}
            className="w-full px-4 py-3 bg-surface-container-highest rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-error/40 [color-scheme:dark]"
          />
          {until && (
            <p className="text-xs text-yellow-400">
              El acceso se restaurará automáticamente el {new Date(until + 'T00:00:00').toLocaleDateString('es-EC')}
            </p>
          )}
          {!until && (
            <p className="text-xs text-zinc-500">Sin fecha: suspensión indefinida hasta revisión manual.</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-on-surface-variant font-bold text-sm hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 py-3 rounded-xl bg-error/20 border border-error/30 text-error font-bold text-sm hover:bg-error/30 transition-all disabled:opacity-50"
          >
            {mutation.isPending ? 'Procesando...' : 'Suspender'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── User Detail Modal ──────────────────────────────────────────────
function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: () => adminApi.getUserDetail(userId).then((r) => r.data.user),
  })

  const REASON_SHORT: Record<string, string> = {
    INAPPROPRIATE_BEHAVIOR: 'Comportamiento',
    NO_SHOW: 'No se presentó',
    FRAUD: 'Fraude',
    UNSAFE_DRIVING: 'Conducción',
    HARASSMENT: 'Hostigamiento',
    OTHER: 'Otro',
  }

  const TRIP_STATUS_COLOR: Record<string, string> = {
    SCHEDULED: 'text-primary', IN_PROGRESS: 'text-tertiary',
    COMPLETED: 'text-secondary', CANCELLED: 'text-error',
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl bg-surface-container-low rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold text-white">Detalle de Usuario</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-surface-container animate-pulse rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-surface-container-highest flex items-center justify-center font-bold text-xl text-primary flex-shrink-0">
                {data.fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{data.fullName}</h3>
                <p className="text-sm text-on-surface-variant">{data.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${USER_STATUS[data.status]?.className}`}>
                    {USER_STATUS[data.status]?.label}
                  </span>
                  {data.suspendedUntil && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                      hasta {new Date(data.suspendedUntil).toLocaleDateString('es-EC')}
                    </span>
                  )}
                  {data.vehicle && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                      Conductor · {data.vehicle.plateNumber}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-zinc-500">
                <p>★ {Number(data.reputationScore).toFixed(2)}</p>
                <p>{data._count.tripsAsDriver} viajes conductor</p>
                <p>{data._count.tripRequests} como pasajero</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Reportes recibidos', value: data._count.reportsReceived, color: 'text-error' },
                { label: 'Reportes hechos', value: data._count.reportsFiled, color: 'text-yellow-400' },
                { label: 'Viajes conductor', value: data._count.tripsAsDriver, color: 'text-primary' },
                { label: 'Como pasajero', value: data._count.tripRequests, color: 'text-tertiary' },
              ].map((s) => (
                <div key={s.label} className="bg-surface-container p-3 rounded-xl text-center">
                  <p className={`text-2xl font-headline font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Last trips */}
            {data.tripsAsDriver.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Últimos viajes publicados</h4>
                <div className="space-y-2">
                  {data.tripsAsDriver.map((t: AdminUserDetail['tripsAsDriver'][0]) => (
                    <div key={t.id} className="flex items-center justify-between bg-surface-container px-4 py-2 rounded-lg">
                      <p className="text-sm text-white">{t.originZone} → {t.destinationZone}</p>
                      <span className={`text-xs font-bold ${TRIP_STATUS_COLOR[t.status] ?? 'text-zinc-400'}`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last reports received */}
            {data.reportsReceived.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Reportes recibidos recientes</h4>
                <div className="space-y-2">
                  {data.reportsReceived.map((r: AdminUserDetail['reportsReceived'][0]) => (
                    <div key={r.id} className="flex items-start gap-3 bg-surface-container px-4 py-3 rounded-lg">
                      <span className="text-xs font-bold text-error bg-error/10 px-2 py-0.5 rounded-full mt-0.5">
                        {REASON_SHORT[r.reason] ?? r.reason}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{r.description}</p>
                        <p className="text-[10px] text-zinc-600">por {r.reporter.fullName}</p>
                      </div>
                      <span className={`text-[10px] font-bold flex-shrink-0 ${r.status === 'OPEN' ? 'text-yellow-400' : 'text-zinc-500'}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('reports')
  const [reviewTarget, setReviewTarget] = useState<AdminReport | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<TripEventType | ''>('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null)
  const [tripStatusFilter, setTripStatusFilter] = useState('')
  const [cancelTripTarget, setCancelTripTarget] = useState<AdminTrip | null>(null)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const qc = useQueryClient()

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: reportsData, isLoading: loadingReports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adminApi.getReports({ limit: 20 }).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users', userSearch],
    queryFn: () => adminApi.getUsers({ search: userSearch || undefined, limit: 20 }).then((r) => r.data),
    enabled: tab === 'users',
  })

  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['admin-events', eventTypeFilter],
    queryFn: () =>
      adminApi.getEvents({ type: eventTypeFilter || undefined, limit: 30 }).then((r) => r.data),
    enabled: tab === 'events',
    refetchInterval: 15_000,
  })

  const { data: tripsData, isLoading: loadingTrips } = useQuery({
    queryKey: ['admin-trips', tripStatusFilter],
    queryFn: () =>
      adminApi.getTrips({ status: tripStatusFilter || undefined, limit: 20 }).then((r) => r.data),
    enabled: tab === 'trips',
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'WARNED' }) =>
      adminApi.updateUserStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  const cancelTripMut = useMutation({
    mutationFn: (id: string) => adminApi.cancelTrip(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-trips'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setCancelTripTarget(null)
    },
  })

  const adminInitials = user ? initials(user.fullName) : 'AK'

  const StatCard = ({
    label, value, icon, borderColor, sub,
  }: { label: string; value: string | number; icon: string; borderColor: string; sub: string }) => (
    <div className={`bg-surface-container p-6 rounded-xl flex flex-col justify-between border-l-4 ${borderColor}`}>
      <div className="flex justify-between items-start">
        <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{label}</span>
        <span className={`material-symbols-outlined ${borderColor.replace('border-', 'text-')}`}>{icon}</span>
      </div>
      <div className="mt-4">
        {loadingStats ? (
          <div className="h-10 w-20 bg-surface-container-high animate-pulse rounded-lg" />
        ) : (
          <span className="text-4xl font-headline font-bold text-white">{value}</span>
        )}
        <p className="text-[10px] text-zinc-500 mt-2">{sub}</p>
      </div>
    </div>
  )

  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex">

      {/* ── Sidebar ── */}
      <aside className="h-screen w-72 fixed left-0 top-0 bg-surface-container-low flex flex-col p-6 gap-2 z-50">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary material-symbols-filled">navigation</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-headline leading-tight">U-Ride</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-label">Admin Panel</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 grow">
          {([
            { id: 'reports', icon: 'flag',          label: 'Reportes',      badge: stats?.reports.open },
            { id: 'users',   icon: 'person_search', label: 'Usuarios' },
            { id: 'trips',   icon: 'directions_car',label: 'Viajes' },
            { id: 'events',  icon: 'history',       label: 'Trazabilidad' },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-3 flex items-center gap-3 font-headline font-medium transition-all text-left ${
                tab === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-zinc-500 hover:bg-surface-container hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
              {'badge' in item && item.badge && item.badge > 0 && (
                <span className="ml-auto text-[10px] font-black bg-error/20 text-error px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div className="h-px bg-white/5 my-4 mx-4" />

          <button
            onClick={() => navigate('/trips')}
            className="text-zinc-500 px-4 py-3 flex items-center gap-3 font-headline font-medium hover:bg-surface-container hover:text-primary transition-all text-left rounded-lg"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver al App</span>
          </button>
        </nav>

        <div className="mt-auto border-t border-white/5 pt-6 flex flex-col gap-2">
          <div className="px-4 py-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-bold text-primary">
              {adminInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.fullName}</p>
              <p className="text-[10px] text-primary uppercase tracking-tighter">Superuser</p>
            </div>
          </div>
          <button
            onClick={() => { clearAuth(); navigate('/login') }}
            className="mt-2 w-full bg-surface-container-highest text-white/70 py-3 rounded-xl font-headline font-bold text-sm uppercase tracking-widest hover:bg-error/20 hover:text-error transition-all duration-300"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-72 flex-1 flex flex-col min-h-screen">

        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-8 py-4 flex justify-between items-center border-b border-white/5">
          <div>
            <h2 className="font-headline text-2xl font-bold tracking-tight text-white">
              Dashboard <span className="text-primary">Admin</span>
            </h2>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-1">
              Gestión Central de la Comunidad
            </p>
          </div>
          {tab === 'users' && (
            <div className="relative">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar usuario..."
                className="bg-surface-container-highest border-none rounded-full px-6 py-2.5 text-sm w-64 focus:ring-1 focus:ring-primary/40 outline-none placeholder:text-zinc-600"
              />
              <span className="material-symbols-outlined absolute right-4 top-2.5 text-zinc-500">search</span>
            </div>
          )}
          {tab === 'trips' && (
            <select
              value={tripStatusFilter}
              onChange={(e) => setTripStatusFilter(e.target.value)}
              className="bg-surface-container-highest border-none rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary/40 outline-none"
            >
              <option value="">Todos los estados</option>
              {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          {tab === 'events' && (
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value as TripEventType | '')}
              className="bg-surface-container-highest border-none rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary/40 outline-none"
            >
              <option value="">Todos los eventos</option>
              {(Object.keys(EVENT_META) as TripEventType[]).map((t) => (
                <option key={t} value={t}>{EVENT_META[t].label}</option>
              ))}
            </select>
          )}
        </header>

        <div className="px-8 py-8 flex-1">

          {/* Stats bento */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard
              label="Reportes Abiertos"
              value={stats?.reports.open ?? '—'}
              icon="flag"
              borderColor="border-error"
              sub={`${stats?.reports.total ?? 0} en total`}
            />
            <StatCard
              label="Usuarios Activos"
              value={stats?.users.active ?? '—'}
              icon="group"
              borderColor="border-primary"
              sub={`${stats?.users.total ?? 0} registrados · ${stats?.users.suspended ?? 0} susp.`}
            />
            <StatCard
              label="Viajes Completados"
              value={stats?.trips.completed ?? '—'}
              icon="check_circle"
              borderColor="border-tertiary"
              sub={`${stats?.trips.active ?? 0} activos · ${stats?.trips.cancelled ?? 0} cancelados`}
            />
            <StatCard
              label="Reputación Promedio"
              value={stats ? `${stats.avgReputation}★` : '—'}
              icon="stars"
              borderColor="border-yellow-500"
              sub={`$${stats?.revenue.toFixed(2) ?? '0.00'} recargado en wallets`}
            />
          </section>

          {/* ── Tab: Reports ── */}
          {tab === 'reports' && (
            <section className="bg-surface-container-low rounded-2xl overflow-hidden">
              <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-headline font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">flag</span>
                  Gestión de Reportes
                </h3>
                <span className="text-xs text-on-surface-variant">
                  {reportsData?.total ?? 0} reportes en total
                </span>
              </div>

              {loadingReports ? (
                <div className="p-8 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 bg-surface-container animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (reportsData?.reports.length ?? 0) === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                  <span className="material-symbols-outlined text-5xl text-zinc-600">flag</span>
                  <p className="text-on-surface-variant">No hay reportes pendientes.</p>
                </div>
              ) : (
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-zinc-500 text-[10px] uppercase tracking-widest font-label">
                        <th className="px-6 py-3 font-medium">Reportado por</th>
                        <th className="px-6 py-3 font-medium">Usuario reportado</th>
                        <th className="px-6 py-3 font-medium">Motivo</th>
                        <th className="px-6 py-3 font-medium">Estado</th>
                        <th className="px-6 py-3 font-medium">Fecha</th>
                        <th className="px-6 py-3 font-medium text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {reportsData?.reports.map((report) => {
                        const badge = REPORT_STATUS[report.status] ?? REPORT_STATUS.OPEN
                        const isOpen = report.status === 'OPEN'
                        return (
                          <tr
                            key={report.id}
                            className={`bg-surface-container hover:bg-surface-container-high transition-colors ${
                              !isOpen ? 'opacity-60' : ''
                            }`}
                          >
                            <td className="px-6 py-4 rounded-l-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-xs text-primary">
                                  {initials(report.reporter.fullName)}
                                </div>
                                <span className="text-white font-medium">{report.reporter.fullName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center font-bold text-xs text-error">
                                  {initials(report.reported.fullName)}
                                </div>
                                <span className="text-white font-medium">{report.reported.fullName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-zinc-400">
                              {REASON_LABEL[report.reason] ?? report.reason}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-zinc-500 font-label">
                              {new Date(report.createdAt).toLocaleDateString('es-EC', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </td>
                            <td className="px-6 py-4 text-right rounded-r-xl">
                              <button
                                onClick={() => setReviewTarget(report)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                                  isOpen
                                    ? 'bg-primary/10 text-primary hover:bg-primary hover:text-on-primary'
                                    : 'bg-surface-container-highest text-zinc-400 hover:text-white'
                                }`}
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="px-8 py-4 border-t border-white/5 text-xs text-zinc-500">
                Mostrando {reportsData?.reports.length ?? 0} de {reportsData?.total ?? 0} reportes
              </div>
            </section>
          )}

          {/* ── Tab: Users ── */}
          {tab === 'users' && (
            <section className="bg-surface-container-low rounded-2xl overflow-hidden">
              <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-headline font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary">person_search</span>
                  Gestión de Usuarios
                </h3>
                <span className="text-xs text-on-surface-variant">
                  {usersData?.total ?? 0} usuarios registrados
                </span>
              </div>

              {loadingUsers ? (
                <div className="p-8 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 bg-surface-container animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (usersData?.users.length ?? 0) === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                  <span className="material-symbols-outlined text-5xl text-zinc-600">person_search</span>
                  <p className="text-on-surface-variant">No se encontraron usuarios.</p>
                </div>
              ) : (
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-zinc-500 text-[10px] uppercase tracking-widest font-label">
                        <th className="px-6 py-3 font-medium">Usuario</th>
                        <th className="px-6 py-3 font-medium">Carrera</th>
                        <th className="px-6 py-3 font-medium">Reputación</th>
                        <th className="px-6 py-3 font-medium">Viajes</th>
                        <th className="px-6 py-3 font-medium">Estado</th>
                        <th className="px-6 py-3 font-medium text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {usersData?.users.map((u: AdminUser) => {
                        const badge = USER_STATUS[u.status] ?? USER_STATUS.ACTIVE
                        return (
                          <tr
                            key={u.id}
                            className={`bg-surface-container hover:bg-surface-container-high transition-colors ${
                              u.status === 'SUSPENDED' ? 'opacity-50' : ''
                            }`}
                          >
                            <td className="px-6 py-4 rounded-l-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center font-bold text-xs text-primary">
                                  {initials(u.fullName)}
                                </div>
                                <div>
                                  <p className="text-white font-medium">{u.fullName}</p>
                                  <p className="text-zinc-500 text-xs">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-zinc-400 text-xs">{u.career ?? '—'}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-primary text-sm material-symbols-filled">star</span>
                                <span className="text-white font-bold">{Number(u.reputationScore).toFixed(1)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-white font-bold">{u.totalTrips}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right rounded-r-xl">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setSelectedUserId(u.id)}
                                  className="px-3 py-1.5 bg-surface-container-highest text-on-surface-variant text-xs font-bold rounded-lg hover:text-white transition-all"
                                >
                                  Ver
                                </button>
                                {u.status !== 'ACTIVE' && (
                                  <button
                                    onClick={() => updateStatusMut.mutate({ id: u.id, status: 'ACTIVE' })}
                                    disabled={updateStatusMut.isPending}
                                    className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary hover:text-on-primary transition-all"
                                  >
                                    Activar
                                  </button>
                                )}
                                {u.status !== 'WARNED' && (
                                  <button
                                    onClick={() => updateStatusMut.mutate({ id: u.id, status: 'WARNED' })}
                                    disabled={updateStatusMut.isPending}
                                    className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 text-xs font-bold rounded-lg hover:bg-yellow-500/20 transition-all"
                                  >
                                    Advertir
                                  </button>
                                )}
                                {u.status !== 'SUSPENDED' && (
                                  <button
                                    onClick={() => setSuspendTarget(u)}
                                    className="px-3 py-1.5 bg-error/10 text-error text-xs font-bold rounded-lg hover:bg-error/20 transition-all"
                                  >
                                    Suspender
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="px-8 py-4 border-t border-white/5 text-xs text-zinc-500">
                Mostrando {usersData?.users.length ?? 0} de {usersData?.total ?? 0} usuarios
              </div>
            </section>
          )}

          {/* ── Tab: Trips ── */}
          {tab === 'trips' && (
            <section className="bg-surface-container-low rounded-2xl overflow-hidden">
              <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-headline font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">directions_car</span>
                  Gestión de Viajes
                </h3>
                <span className="text-xs text-on-surface-variant">{tripsData?.total ?? 0} viajes</span>
              </div>

              {loadingTrips ? (
                <div className="p-8 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 bg-surface-container animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (tripsData?.trips.length ?? 0) === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                  <span className="material-symbols-outlined text-5xl text-zinc-600">directions_car</span>
                  <p className="text-on-surface-variant">No hay viajes con ese filtro.</p>
                </div>
              ) : (
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-zinc-500 text-[10px] uppercase tracking-widest font-label">
                        <th className="px-6 py-3 font-medium">Ruta</th>
                        <th className="px-6 py-3 font-medium">Conductor</th>
                        <th className="px-6 py-3 font-medium">Salida</th>
                        <th className="px-6 py-3 font-medium">Cupos</th>
                        <th className="px-6 py-3 font-medium">Estado</th>
                        <th className="px-6 py-3 font-medium text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {tripsData?.trips.map((trip: AdminTrip) => {
                        const statusColor: Record<string, string> = {
                          SCHEDULED: 'bg-primary/10 text-primary border-primary/20',
                          IN_PROGRESS: 'bg-tertiary/10 text-tertiary border-tertiary/20',
                          COMPLETED: 'bg-secondary/10 text-secondary border-secondary/20',
                          CANCELLED: 'bg-error/10 text-error border-error/20',
                        }
                        const isCancellable = ['SCHEDULED', 'IN_PROGRESS'].includes(trip.status)
                        return (
                          <tr key={trip.id} className={`bg-surface-container hover:bg-surface-container-high transition-colors ${trip.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                            <td className="px-6 py-4 rounded-l-xl">
                              <p className="text-white font-medium text-sm">{trip.originZone}</p>
                              <p className="text-zinc-400 text-xs">→ {trip.destinationZone}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm">{trip.driver.fullName}</p>
                              <p className="text-zinc-500 text-xs">{trip.driver.email}</p>
                            </td>
                            <td className="px-6 py-4 text-zinc-400 text-xs">
                              {new Date(trip.departureTime).toLocaleString('es-EC', {
                                dateStyle: 'short', timeStyle: 'short',
                              })}
                            </td>
                            <td className="px-6 py-4 text-white font-bold">
                              {trip.availableSeats}/{trip.totalSeats}
                              <span className="text-[10px] text-zinc-500 ml-1">({trip._count.requests} sol.)</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor[trip.status] ?? ''}`}>
                                {trip.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right rounded-r-xl">
                              {isCancellable && (
                                cancelTripTarget?.id === trip.id ? (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => cancelTripMut.mutate(trip.id)}
                                      disabled={cancelTripMut.isPending}
                                      className="px-3 py-1.5 bg-error/20 border border-error/30 text-error text-xs font-bold rounded-lg hover:bg-error/30 transition-all disabled:opacity-50"
                                    >
                                      {cancelTripMut.isPending ? '...' : 'Confirmar'}
                                    </button>
                                    <button
                                      onClick={() => setCancelTripTarget(null)}
                                      className="px-3 py-1.5 text-zinc-500 hover:text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setCancelTripTarget(trip)}
                                    className="px-3 py-1.5 bg-error/10 text-error text-xs font-bold rounded-lg hover:bg-error/20 transition-all"
                                  >
                                    Cancelar
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-8 py-4 border-t border-white/5 text-xs text-zinc-500">
                Mostrando {tripsData?.trips.length ?? 0} de {tripsData?.total ?? 0} viajes
              </div>
            </section>
          )}

          {/* ── Tab: Events ── */}
          {tab === 'events' && (
            <section className="bg-surface-container-low rounded-2xl overflow-hidden">
              <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-headline font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">history</span>
                  Registro de Eventos
                </h3>
                <span className="text-xs text-on-surface-variant">
                  {eventsData?.total ?? 0} eventos registrados
                </span>
              </div>

              {loadingEvents ? (
                <div className="p-8 space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-14 bg-surface-container animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (eventsData?.events.length ?? 0) === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                  <span className="material-symbols-outlined text-5xl text-zinc-600">history</span>
                  <p className="text-on-surface-variant">No hay eventos registrados aún.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {eventsData?.events.map((ev: TripEvent) => {
                    const meta = EVENT_META[ev.type]
                    return (
                      <div
                        key={ev.id}
                        className="flex items-start gap-4 px-8 py-4 hover:bg-surface-container transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className={`material-symbols-outlined text-sm ${meta.color}`}>
                            {meta.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{meta.label}</span>
                            <span className="text-xs text-zinc-500 font-mono">
                              {ev.trip.originZone} → {ev.trip.destinationZone}
                            </span>
                          </div>
                          {ev.actor && (
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              por <span className="text-white">{ev.actor.fullName}</span>
                              <span className="text-zinc-600"> · {ev.actor.email}</span>
                            </p>
                          )}
                          {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                            <p className="text-[10px] text-zinc-600 mt-1 font-mono">
                              {JSON.stringify(ev.metadata)
                                .replace(/[{}"]/g, '')
                                .replace(/,/g, ' · ')}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap flex-shrink-0 mt-1">
                          {new Date(ev.createdAt).toLocaleString('es-EC', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="px-8 py-4 border-t border-white/5 text-xs text-zinc-500 flex items-center justify-between">
                <span>Mostrando {eventsData?.events.length ?? 0} de {eventsData?.total ?? 0} eventos</span>
                <span className="flex items-center gap-1 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Actualización automática cada 15s
                </span>
              </div>
            </section>
          )}

        </div>

        <footer className="px-8 py-10 border-t border-white/5 bg-surface flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-headline font-bold text-primary text-xl">U-Ride Institutional</span>
          <p className="font-label text-xs uppercase tracking-widest text-zinc-600">
            © 2025 U-Ride Institutional. Plataforma académica de transporte seguro.
          </p>
        </footer>
      </main>

      {reviewTarget && (
        <ReviewModal report={reviewTarget} onClose={() => setReviewTarget(null)} />
      )}
      {suspendTarget && (
        <SuspendModal user={suspendTarget} onClose={() => setSuspendTarget(null)} />
      )}
      {selectedUserId && (
        <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  )
}

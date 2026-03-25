import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type AdminReport, type AdminUser } from '@/api/admin.api'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

type Tab = 'reports' | 'users'

// ── Status configs ────────────────────────────────────────────────
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

// ── Initials helper ───────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

// ── Review modal ──────────────────────────────────────────────────
function ReviewModal({
  report,
  onClose,
}: {
  report: AdminReport
  onClose: () => void
}) {
  const [action, setAction] = useState<'WARNED' | 'SUSPENDED' | 'DISMISSED'>('WARNED')
  const [notes, setNotes] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => adminApi.reviewReport(report.id, { action, notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reports'] })
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

// ── Main component ────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('reports')
  const [reviewTarget, setReviewTarget] = useState<AdminReport | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const qc = useQueryClient()

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

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'WARNED' | 'SUSPENDED' }) =>
      adminApi.updateUserStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const adminInitials = user ? initials(user.fullName) : 'AK'

  const openReports  = reportsData?.reports.filter((r) => r.status === 'OPEN').length ?? 0
  const totalUsers   = usersData?.total ?? reportsData?.total ?? 0

  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex">

      {/* ── Sidebar ── */}
      <aside className="h-screen w-72 fixed left-0 top-0 bg-surface-container-low flex flex-col p-6 gap-2 z-50">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary material-symbols-filled">navigation</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-headline leading-tight">U-Ride</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-label">
              The Academic Kinetic
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 grow">
          <button
            onClick={() => setTab('reports')}
            className={`rounded-lg px-4 py-3 flex items-center gap-3 font-headline font-medium transition-all text-left ${
              tab === 'reports'
                ? 'bg-primary/10 text-primary'
                : 'text-zinc-500 hover:bg-surface-container hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined">flag</span>
            <span>Reportes</span>
            {openReports > 0 && (
              <span className="ml-auto text-[10px] font-black bg-error/20 text-error px-2 py-0.5 rounded-full">
                {openReports}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('users')}
            className={`rounded-lg px-4 py-3 flex items-center gap-3 font-headline font-medium transition-all text-left ${
              tab === 'users'
                ? 'bg-primary/10 text-primary'
                : 'text-zinc-500 hover:bg-surface-container hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined">person_search</span>
            <span>Usuarios</span>
          </button>

          <div className="h-px bg-white/5 my-4 mx-4" />

          <button
            onClick={() => navigate('/trips')}
            className="text-zinc-500 px-4 py-3 flex items-center gap-3 font-headline font-medium hover:bg-surface-container hover:text-primary transition-all text-left rounded-lg"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver al App</span>
          </button>
        </nav>

        {/* Bottom */}
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

        {/* Header */}
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
        </header>

        <div className="px-8 py-8 flex-1">

          {/* Stats bento */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-surface-container p-6 rounded-xl flex flex-col justify-between border-l-4 border-primary">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Reportes Abiertos</span>
                <span className="material-symbols-outlined text-primary">flag</span>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-headline font-bold text-white">{openReports}</span>
                <div className="flex items-center gap-1 text-[10px] text-error mt-2">
                  <span className="material-symbols-outlined text-sm">priority_high</span>
                  <span>Requieren revisión</span>
                </div>
              </div>
            </div>
            <div className="bg-surface-container p-6 rounded-xl flex flex-col justify-between border-l-4 border-tertiary">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Reportes</span>
                <span className="material-symbols-outlined text-tertiary">analytics</span>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-headline font-bold text-white">
                  {reportsData?.total ?? '—'}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-2">
                  <span className="material-symbols-outlined text-sm">history</span>
                  <span>Histórico total</span>
                </div>
              </div>
            </div>
            <div className="bg-surface-container p-6 rounded-xl flex flex-col justify-between border-l-4 border-secondary">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Usuarios</span>
                <span className="material-symbols-outlined text-secondary">group</span>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-headline font-bold text-white">
                  {reportsData ? '—' : '—'}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-2">
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>Comunidad activa</span>
                </div>
              </div>
            </div>
            <div className="bg-surface-container p-6 rounded-xl flex flex-col justify-between border-l-4 border-yellow-500">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Reputación Avg</span>
                <span className="material-symbols-outlined text-yellow-500">stars</span>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-headline font-bold text-white">4.8</span>
                <div className="flex items-center gap-1 text-[10px] text-secondary mt-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Comunidad saludable</span>
                </div>
              </div>
            </div>
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
                      {usersData?.users.map((u) => {
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
                                    onClick={() => updateStatusMut.mutate({ id: u.id, status: 'SUSPENDED' })}
                                    disabled={updateStatusMut.isPending}
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

          {/* Security insight */}
          <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-surface-container p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[80px] text-primary">security</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-white mb-2">Protocolo de Seguridad Kinetic</h3>
              <p className="text-zinc-400 text-sm max-w-lg mb-6 leading-relaxed">
                Monitoreo continuo de la comunidad U-Ride. Los reportes abiertos requieren revisión en menos de 24 horas hábiles para mantener la seguridad institucional.
              </p>
              <button className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest hover:translate-x-1 transition-transform">
                Ver análisis <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="bg-surface-container p-8 rounded-2xl border border-white/5">
              <h3 className="font-headline text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Logs del Sistema</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-white font-medium">Sistema operativo</p>
                    <p className="text-[10px] text-zinc-500">Backend v1.0 activo</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-white font-medium">Socket.io conectado</p>
                    <p className="text-[10px] text-zinc-500">GPS tracking activo</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-white font-medium">Pagos simulados</p>
                    <p className="text-[10px] text-zinc-500">Entorno académico</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

        <footer className="px-8 py-10 border-t border-white/5 bg-surface flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-headline font-bold text-primary text-xl">U-Ride Institutional</span>
          <p className="font-label text-xs uppercase tracking-widest text-zinc-600">
            © 2024 U-Ride Institutional. Powered by Academic Kinetic.
          </p>
        </footer>
      </main>

      {/* Review modal */}
      {reviewTarget && (
        <ReviewModal report={reviewTarget} onClose={() => setReviewTarget(null)} />
      )}

      {/* Emergency FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-error text-on-error rounded-full shadow-[0_0_32px_rgba(255,115,81,0.2)] flex items-center justify-center group hover:scale-110 active:scale-95 transition-all duration-300 z-50">
        <span className="material-symbols-outlined material-symbols-filled">emergency_home</span>
        <span className="absolute right-full mr-4 px-3 py-1 bg-surface-container-highest text-white text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Alerta Global
        </span>
      </button>
    </div>
  )
}

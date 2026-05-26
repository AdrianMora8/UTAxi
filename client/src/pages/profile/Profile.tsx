import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/users.api'
import { useAuthStore } from '@/store/authStore'

// ─── Schemas ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  career: z.string().min(2, 'Mínimo 2 caracteres').max(100).optional().or(z.literal('')),
  phone: z.string().min(7, 'Mínimo 7 dígitos').max(20).optional().or(z.literal('')),
  neighborhood: z.string().min(2, 'Mínimo 2 caracteres').max(100).optional().or(z.literal('')),
})

const vehicleSchema = z.object({
  brand: z.string().min(2, 'Requerido').max(50),
  model: z.string().min(1, 'Requerido').max(50),
  year: z.coerce.number().int().min(1990, 'Año mínimo: 1990').max(new Date().getFullYear() + 1),
  plateNumber: z.string().min(4, 'Mínimo 4 caracteres').max(10).transform((v) => v.toUpperCase()),
  color: z.string().min(2, 'Requerido').max(30),
})

type ProfileForm = z.infer<typeof profileSchema>
type VehicleForm = z.infer<typeof vehicleSchema>

type Tab = 'datos' | 'vehiculo'

// ─── Reputation bars (decorative) ───────────────────────────────────────────
const repBars = [
  { label: 'Puntualidad', value: 92, color: 'bg-gradient-primary' },
  { label: 'Seguridad', value: 100, color: 'bg-tertiary' },
  { label: 'Conversación', value: 80, color: 'bg-gradient-primary' },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function Profile() {
  const [tab, setTab] = useState<Tab>('datos')
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [vehicleSuccess, setVehicleSuccess] = useState(false)

  const setAuth = useAuthStore((s) => s.setAuth)
  const storeUser = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then((r) => r.data),
    staleTime: 60_000,
  })

  const user = data?.user

  // Profile form
  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors, isSubmitting: profileSaving },
    reset: resetProfile,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: user
      ? {
          fullName: user.fullName ?? '',
          career: user.career ?? '',
          phone: user.phone ?? '',
          neighborhood: user.neighborhood ?? '',
        }
      : undefined,
  })

  const updateMeMut = useMutation({
    mutationFn: (data: ProfileForm) =>
      usersApi.updateMe({
        fullName: data.fullName,
        career: data.career || undefined,
        phone: data.phone || undefined,
        neighborhood: data.neighborhood || undefined,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['me'] })
      // sync Zustand so Navbar/greeting updates
      if (storeUser && accessToken) {
        setAuth({ ...storeUser, fullName: res.data.user.fullName }, accessToken)
      }
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    },
  })

  // Vehicle form
  const hasVehicle = !!user?.vehicle

  const {
    register: regVehicle,
    handleSubmit: handleVehicle,
    formState: { errors: vehicleErrors, isSubmitting: vehicleSaving },
  } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    values: user?.vehicle
      ? {
          brand: user.vehicle.brand,
          model: user.vehicle.model,
          year: user.vehicle.year,
          plateNumber: user.vehicle.plateNumber,
          color: user.vehicle.color,
        }
      : undefined,
  })

  const [vehicleServerError, setVehicleServerError] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteVehicleMut = useMutation({
    mutationFn: () => usersApi.deleteVehicle(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      setConfirmDelete(false)
    },
  })

  const vehicleMut = useMutation({
    mutationFn: (data: VehicleForm) =>
      hasVehicle ? usersApi.updateVehicle(data) : usersApi.createVehicle(data),
    onSuccess: async () => {
      if (!hasVehicle && pendingPhoto) {
        setPhotoUploading(true)
        try {
          await usersApi.uploadVehiclePhoto(pendingPhoto)
        } finally {
          setPhotoUploading(false)
          setPendingPhoto(null)
          setPendingPhotoPreview(null)
        }
      }
      qc.invalidateQueries({ queryKey: ['me'] })
      setVehicleSuccess(true)
      setVehicleServerError('')
      setTimeout(() => setVehicleSuccess(false), 3000)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.error ?? (err as any)?.response?.data?.message ??
        'Error al guardar el vehículo'
      setVehicleServerError(msg)
    },
  })

  const MAX_PHOTO_SIZE = 8 * 1024 * 1024

  async function handleVehiclePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_PHOTO_SIZE) {
      setVehicleServerError('La imagen es demasiado grande (máximo 8 MB)')
      e.target.value = ''
      return
    }
    setPhotoUploading(true)
    try {
      await usersApi.uploadVehiclePhoto(file)
      qc.invalidateQueries({ queryKey: ['me'] })
    } catch {
      setVehicleServerError('Error al subir la foto. Intenta de nuevo.')
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  function handlePendingPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_PHOTO_SIZE) {
      setVehicleServerError('La imagen es demasiado grande (máximo 8 MB)')
      e.target.value = ''
      return
    }
    setVehicleServerError('')
    setPendingPhoto(file)
    setPendingPhotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const initials = user?.fullName
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('') ?? '?'

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <main className="pt-6 pb-20 px-4 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ── Left: Profile Card + Reputation ── */}
        <aside className="lg:col-span-4 space-y-6">

          {/* Profile Card */}
          <div className="bg-surface-container-low rounded-xl p-8 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-primary rounded-full blur opacity-25 group-hover:opacity-50 transition duration-700" />
              <div className="relative w-32 h-32 rounded-full bg-surface-container-highest border-4 border-surface-container flex items-center justify-center">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.fullName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="font-headline font-bold text-4xl text-on-surface-variant">
                    {initials}
                  </span>
                )}
              </div>
              <div className="absolute bottom-1 right-1 bg-tertiary p-1.5 rounded-full shadow-lg">
                <span className="material-symbols-outlined text-on-tertiary text-sm material-symbols-filled">
                  verified
                </span>
              </div>
            </div>

            <h1 className="mt-6 font-headline text-3xl font-bold tracking-tight text-on-surface">
              {user.fullName}
            </h1>
            {user.career && (
              <p className="text-on-surface-variant font-medium mt-1">{user.career}</p>
            )}
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-surface-container-highest rounded-full text-xs font-bold uppercase tracking-widest text-primary">
              <span className="material-symbols-outlined text-sm">school</span>
              Universidad Técnica de Ambato
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 w-full mt-10">
              <div className="bg-surface-container p-4 rounded-xl border border-white/5">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">
                  Reputación
                </p>
                <div className="flex items-center justify-center gap-1 mt-2 text-primary">
                  <span className="text-xl font-headline font-bold">
                    {user.reputationScore.toFixed(1)}
                  </span>
                  <span className="material-symbols-outlined text-lg material-symbols-filled">star</span>
                </div>
              </div>
              <div className="bg-surface-container p-4 rounded-xl border border-white/5">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">
                  Viajes
                </p>
                <div className="flex items-center justify-center gap-1 mt-2 text-on-surface">
                  <span className="text-xl font-headline font-bold">{user.totalTrips}</span>
                  <span className="material-symbols-outlined text-lg">route</span>
                </div>
              </div>
            </div>


          </div>

          {/* Reputation Breakdown */}
          <div className="bg-surface-container-low rounded-xl p-8">
            <h3 className="font-headline text-xl font-bold mb-6">Desglose de Calidad</h3>
            <div className="space-y-4">
              {repBars.map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-on-surface-variant">{bar.label}</span>
                    <span className="text-on-surface">{bar.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                      style={{ width: `${bar.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Right: Tabs ── */}
        <div className="lg:col-span-8 space-y-8">

          {/* Tab bar */}
          <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl w-fit">
            {(['datos', 'vehiculo'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-3 rounded-lg font-headline font-bold text-sm uppercase tracking-wide transition-all ${
                  tab === t
                    ? 'bg-surface-container text-primary shadow'
                    : 'text-on-surface-variant hover:text-white'
                }`}
              >
                {t === 'datos' ? 'Datos Personales' : 'Vehículo'}
              </button>
            ))}
          </div>

          {/* ─── Datos Personales Tab ─── */}
          {tab === 'datos' && (
            <section className="bg-surface-container-low rounded-xl p-8">
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div>
                    <h2 className="font-headline text-xl font-bold">Información Personal</h2>
                    <p className="text-on-surface-variant text-sm">Actualiza tus datos de perfil</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('datos')}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                  title="Editar información"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
              </div>

              <form
                onSubmit={handleProfile((data) => updateMeMut.mutate(data))}
                className="space-y-6"
              >
                {/* Nombre completo */}
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                    Nombre Completo
                  </label>
                  <input
                    {...regProfile('fullName')}
                    type="text"
                    className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                    placeholder="Tu nombre completo"
                  />
                  {profileErrors.fullName && (
                    <p className="mt-1 text-xs text-error">{profileErrors.fullName.message}</p>
                  )}
                </div>

                {/* Carrera */}
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                    Carrera / Facultad
                  </label>
                  <input
                    {...regProfile('career')}
                    type="text"
                    className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                    placeholder="Ej: Ingeniería de Software"
                  />
                  {profileErrors.career && (
                    <p className="mt-1 text-xs text-error">{profileErrors.career.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                      Teléfono
                    </label>
                    <input
                      {...regProfile('phone')}
                      type="tel"
                      className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                      placeholder="0987654321"
                    />
                    {profileErrors.phone && (
                      <p className="mt-1 text-xs text-error">{profileErrors.phone.message}</p>
                    )}
                  </div>

                  {/* Barrio */}
                  <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                      Barrio / Sector
                    </label>
                    <input
                      {...regProfile('neighborhood')}
                      type="text"
                      className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                      placeholder="Ej: Ficoa"
                    />
                    {profileErrors.neighborhood && (
                      <p className="mt-1 text-xs text-error">{profileErrors.neighborhood.message}</p>
                    )}
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                    Correo Institucional
                  </label>
                  <div className="w-full bg-surface-container border-none rounded-lg p-4 text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-outline">lock</span>
                    {user.email}
                  </div>
                </div>

                {profileSuccess && (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-primary text-sm material-symbols-filled">check_circle</span>
                    <span className="text-sm text-primary font-medium">Perfil actualizado correctamente.</span>
                  </div>
                )}

                {updateMeMut.error && (
                  <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-error text-sm">error</span>
                    <p className="text-sm text-error">
                      {(updateMeMut.error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.error ?? (err as any)?.response?.data?.message ?? 'Error al actualizar el perfil'}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full bg-gradient-primary text-on-primary py-4 rounded-lg font-headline font-bold text-lg active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,255,65,0.15)] hover:shadow-[0_4px_20px_rgba(0,255,65,0.25)] disabled:opacity-50"
                >
                  {profileSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </form>
            </section>
          )}

          {/* ─── Vehículo Tab ─── */}
          {tab === 'vehiculo' && (
            <section className="bg-surface-container-low rounded-xl p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">directions_car</span>
                </div>
                <div>
                  <h2 className="font-headline text-xl font-bold">
                    {hasVehicle ? 'Mi Vehículo' : 'Registrar Vehículo'}
                  </h2>
                  <p className="text-on-surface-variant text-sm">
                    {hasVehicle
                      ? 'Actualiza los datos de tu vehículo'
                      : 'Regístra tu vehículo para publicar viajes'}
                  </p>
                </div>
              </div>

              {/* Current vehicle info (read mode) */}
              {hasVehicle && (() => {
                const v = user.vehicle!
                const vehicleStatus = v.status ?? 'PENDING'
                const isPending = vehicleStatus === 'PENDING'
                const isRejected = vehicleStatus === 'REJECTED'
                const isApproved = vehicleStatus === 'APPROVED'
                const statusStyle = {
                  PENDING:  { cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'En revisión' },
                  APPROVED: { cls: 'bg-primary/10 text-primary border-primary/20',           label: 'Aprobado' },
                  REJECTED: { cls: 'bg-error/10 text-error border-error/20',                 label: 'Rechazado' },
                }[vehicleStatus]

                return (
                  <div className="mb-8 bg-surface-container rounded-xl border border-white/5 overflow-hidden">
                    {/* Photo */}
                    <div className="relative h-40 bg-surface-container-high flex items-center justify-center">
                      {v.photoUrl ? (
                        <img src={v.photoUrl} alt="Foto del vehículo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant/20 text-[80px]">directions_car</span>
                      )}
                      {isApproved && (
                        <label className={`absolute bottom-3 right-3 flex items-center gap-1.5 bg-surface-container-highest/90 backdrop-blur-sm border border-white/10 text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-bright transition-colors ${photoUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <span className="material-symbols-outlined text-sm">{photoUploading ? 'hourglass_empty' : 'photo_camera'}</span>
                          {photoUploading ? 'Subiendo...' : v.photoUrl ? 'Cambiar foto' : 'Agregar foto'}
                          <input type="file" accept="image/*" className="hidden" disabled={photoUploading} onChange={handleVehiclePhoto} />
                        </label>
                      )}
                    </div>

                    {/* Info row */}
                    <div className="p-5 flex items-start gap-4">
                      <div className="flex-1">
                        <p className="font-headline font-bold text-on-surface">
                          {v.brand} {v.model} ({v.year})
                        </p>
                        <p className="text-on-surface-variant text-sm mt-1">{v.color} · {v.plateNumber}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold border flex-shrink-0 ${statusStyle.cls}`}>
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* Status messages */}
                    {isPending && (
                      <div className="mx-5 mb-5 flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-3">
                        <span className="material-symbols-outlined text-yellow-400 text-base mt-0.5">schedule</span>
                        <p className="text-sm text-yellow-300">Tu vehículo está siendo revisado por el administrador. No puedes publicar viajes hasta que sea aprobado.</p>
                      </div>
                    )}

                    {isRejected && (
                      <div className="mx-5 mb-5 space-y-3">
                        <div className="flex items-start gap-2 bg-error/5 border border-error/20 rounded-lg px-4 py-3">
                          <span className="material-symbols-outlined text-error text-base mt-0.5">cancel</span>
                          <div>
                            <p className="text-sm text-error font-bold mb-0.5">Vehículo rechazado</p>
                            {v.rejectionNotes && <p className="text-sm text-on-surface-variant">{v.rejectionNotes}</p>}
                          </div>
                        </div>
                        {v.blockedUntil && new Date(v.blockedUntil) > new Date() ? (
                          <div className="flex items-start gap-2 bg-error/5 border border-error/20 rounded-lg px-4 py-3">
                            <span className="material-symbols-outlined text-error text-base mt-0.5">block</span>
                            <p className="text-sm text-error">Agotaste los 3 intentos. Podrás volver a registrar un vehículo el <span className="font-bold">{new Date(v.blockedUntil).toLocaleDateString('es-EC')}</span>.</p>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 px-1">Intento {v.rejectionCount ?? 1}/3 — corrige los datos y vuelve a enviar.</p>
                        )}
                      </div>
                    )}

                    {/* Delete button */}
                    <div className="px-5 pb-5">
                      {confirmDelete ? (
                        <div className="flex items-center gap-3 bg-error/5 border border-error/20 rounded-lg px-4 py-3">
                          <p className="text-sm text-error flex-1">¿Eliminar el vehículo?</p>
                          <button
                            onClick={() => deleteVehicleMut.mutate()}
                            disabled={deleteVehicleMut.isPending}
                            className="px-3 py-1.5 bg-error/20 text-error text-xs font-bold rounded-lg hover:bg-error/30 transition-all disabled:opacity-50"
                          >
                            {deleteVehicleMut.isPending ? '...' : 'Sí, eliminar'}
                          </button>
                          <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-zinc-500 hover:text-white text-xs font-bold rounded-lg transition-colors">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-error transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Eliminar vehículo
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              {hasVehicle && user.vehicle?.status === 'PENDING' ? null : (
              <form
                onSubmit={handleVehicle((data) => vehicleMut.mutate(data))}
                className="space-y-6"
              >
                {/* Photo picker — solo al registrar un vehículo nuevo */}
                {!hasVehicle && (
                  <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                      Foto del Vehículo <span className="text-zinc-600 normal-case">(opcional)</span>
                    </label>
                    <label className="flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-2 border-dashed border-white/10 bg-surface-container cursor-pointer hover:border-primary/40 hover:bg-surface-container-high transition-all overflow-hidden relative">
                      {pendingPhotoPreview ? (
                        <>
                          <img src={pendingPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl">photo_camera</span>
                          <span className="text-sm text-on-surface-variant">Toca para agregar una foto</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePendingPhoto}
                      />
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Marca */}
                  <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                      Marca
                    </label>
                    <input
                      {...regVehicle('brand')}
                      type="text"
                      className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                      placeholder="Ej: Toyota"
                    />
                    {vehicleErrors.brand && (
                      <p className="mt-1 text-xs text-error">{vehicleErrors.brand.message}</p>
                    )}
                  </div>

                  {/* Modelo */}
                  <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                      Modelo
                    </label>
                    <input
                      {...regVehicle('model')}
                      type="text"
                      className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                      placeholder="Ej: Corolla"
                    />
                    {vehicleErrors.model && (
                      <p className="mt-1 text-xs text-error">{vehicleErrors.model.message}</p>
                    )}
                  </div>

                  {/* Año */}
                  <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                      Año
                    </label>
                    <input
                      {...regVehicle('year')}
                      type="number"
                      min={1990}
                      max={new Date().getFullYear() + 1}
                      className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                      placeholder="2020"
                    />
                    {vehicleErrors.year && (
                      <p className="mt-1 text-xs text-error">{vehicleErrors.year.message}</p>
                    )}
                  </div>

                  {/* Placa */}
                  <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                      Placa
                    </label>
                    <input
                      {...regVehicle('plateNumber')}
                      type="text"
                      className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline uppercase"
                      placeholder="ABC-1234"
                    />
                    {vehicleErrors.plateNumber && (
                      <p className="mt-1 text-xs text-error">{vehicleErrors.plateNumber.message}</p>
                    )}
                  </div>

                  {/* Color */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                      Color
                    </label>
                    <input
                      {...regVehicle('color')}
                      type="text"
                      className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                      placeholder="Ej: Azul Metálico"
                    />
                    {vehicleErrors.color && (
                      <p className="mt-1 text-xs text-error">{vehicleErrors.color.message}</p>
                    )}
                  </div>
                </div>

                {vehicleSuccess && (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-primary text-sm material-symbols-filled">check_circle</span>
                    <span className="text-sm text-primary font-medium">
                      Vehículo {hasVehicle ? 'actualizado' : 'registrado'} correctamente.
                    </span>
                  </div>
                )}

                {vehicleServerError && (
                  <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-error text-sm">error</span>
                    <p className="text-sm text-error">{vehicleServerError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={vehicleSaving || photoUploading}
                  className="w-full bg-gradient-primary text-on-primary py-4 rounded-lg font-headline font-bold text-lg active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,255,65,0.15)] hover:shadow-[0_4px_20px_rgba(0,255,65,0.25)] disabled:opacity-50"
                >
                  {vehicleSaving
                    ? 'Guardando...'
                    : photoUploading
                    ? 'Subiendo foto...'
                    : hasVehicle
                    ? 'Actualizar Vehículo'
                    : 'Registrar Vehículo'}
                </button>
              </form>
              )}
            </section>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-8 bg-[#0e0e0e] border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="font-headline font-bold text-primary text-xl">U-Ride</span>
            <p className="font-label text-xs uppercase tracking-widest text-zinc-600 mt-4">
              © 2024 U-Ride Institutional. Powered by Academic Kinetic.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 md:justify-end">
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Centro de Ayuda</span>
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Privacidad</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth.api'

const schema = z.object({
  fullName: z.string().min(3, 'Nombre muy corto'),
  email: z
    .string()
    .email('Email inválido')
    .endsWith('@uta.edu.ec', 'Debe ser un correo @uta.edu.ec'),
  career: z.string().min(2, 'Selecciona tu carrera'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

type FormData = z.infer<typeof schema>

const CAREERS = [
  { value: 'fise', label: 'Ingeniería en Sistemas' },
  { value: 'fca', label: 'Ciencias Administrativas' },
  { value: 'fcea', label: 'Ciencias de la Salud' },
  { value: 'fadu', label: 'Diseño y Arquitectura' },
  { value: 'fi', label: 'Ingeniería Civil' },
  { value: 'fe', label: 'Ingeniería Eléctrica' },
  { value: 'other', label: 'Otra carrera' },
]

export default function Register() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await authApi.register(data)
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.error ?? (err as any)?.response?.data?.message ??
        'Error al registrarse'
      setServerError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body grid grid-cols-1 lg:grid-cols-2">

      {/* Left: Form */}
      <section className="flex flex-col justify-center px-6 py-12 lg:px-24 bg-surface relative overflow-hidden">
        {/* Decorative blob */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />

        <div className="relative z-10 w-full max-w-md mx-auto lg:mx-0">
          <header className="mb-10">
            <div className="flex items-center gap-2 mb-8">
              <Link
                to="/"
                className="text-3xl font-headline font-bold tracking-tighter text-white uppercase"
              >
                U-Ride
              </Link>
              <div className="h-1 w-12 bg-primary" />
            </div>
            <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight mb-3">
              Únete a la Red
            </h1>
            <p className="text-on-surface-variant font-body">
              Crea tu cuenta institucional para empezar a moverte con eficiencia.
            </p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                Nombre Completo
              </label>
              <input
                {...register('fullName')}
                type="text"
                className="w-full bg-surface-container-highest border-none rounded-lg py-4 px-5 text-on-surface focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none placeholder:text-outline"
                placeholder="Ej. Alex Maldonado"
                autoFocus
              />
              {errors.fullName && (
                <p className="text-xs text-error">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                  Correo Institucional
                </label>
                <span className="flex items-center gap-1 text-[10px] bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[12px] material-symbols-filled">verified</span>
                  UTA VERIFIED
                </span>
              </div>
              <input
                {...register('email')}
                type="email"
                className="w-full bg-surface-container-highest border-none rounded-lg py-4 px-5 text-on-surface focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none placeholder:text-outline"
                placeholder="usuario@uta.edu.ec"
              />
              {errors.email && (
                <p className="text-xs text-error">{errors.email.message}</p>
              )}
            </div>

            {/* Career */}
            <div className="space-y-1.5">
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                Carrera / Facultad
              </label>
              <select
                {...register('career')}
                className="w-full bg-surface-container-highest border-none rounded-lg py-4 px-5 text-on-surface focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  Selecciona tu carrera
                </option>
                {CAREERS.map((c) => (
                  <option key={c.value} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>
              {errors.career && (
                <p className="text-xs text-error">{errors.career.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                Contraseña
              </label>
              <input
                {...register('password')}
                type="password"
                className="w-full bg-surface-container-highest border-none rounded-lg py-4 px-5 text-on-surface focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none placeholder:text-outline"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-xs text-error">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                <span className="material-symbols-outlined text-error text-sm">error</span>
                <p className="text-sm text-error">{serverError}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-primary text-on-primary font-headline font-bold py-4 rounded-lg shadow-[0_0_32px_rgba(0,255,65,0.15)] hover:shadow-[0_0_32px_rgba(0,255,65,0.25)] transition-all active:scale-[0.98] uppercase tracking-wider disabled:opacity-50"
              >
                {isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta Institucional'}
              </button>
            </div>
          </form>

          <footer className="mt-12 pt-8 border-t border-white/5 flex flex-col gap-4">
            <p className="text-center text-on-surface-variant text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="text-primary font-semibold hover:underline decoration-primary/30 underline-offset-4"
              >
                Inicia Sesión
              </Link>
            </p>
            <div className="flex justify-center gap-6 opacity-40">
              <span className="text-[10px] font-label uppercase tracking-tighter">UTA Academic Kinetic</span>
              <span className="text-[10px] font-label uppercase tracking-tighter">Security Protocol v2.4</span>
            </div>
          </footer>
        </div>
      </section>

      {/* Right: Bento benefits (desktop only) */}
      <section className="hidden lg:flex flex-col justify-center px-16 bg-surface-container-low relative overflow-hidden">
        <div className="relative z-10 w-full max-w-4xl mx-auto">
          <div className="grid grid-cols-6 grid-rows-6 gap-4 h-[620px]">

            {/* Security — large */}
            <div className="col-span-4 row-span-3 glass-panel rounded-xl p-8 flex flex-col justify-between border border-white/5">
              <div>
                <div className="w-12 h-12 rounded-lg bg-tertiary/20 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-tertiary text-3xl material-symbols-filled">shield_with_heart</span>
                </div>
                <h3 className="text-3xl font-headline font-bold text-white mb-4">
                  Seguridad Institucional
                </h3>
                <p className="text-on-surface-variant text-lg leading-relaxed">
                  Solo miembros verificados de la{' '}
                  <span className="text-tertiary">@uta.edu.ec</span> pueden acceder.
                  Rastreo en tiempo real y perfiles validados.
                </p>
              </div>
              <div className="flex items-center gap-4 pt-6">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-surface-container bg-surface-container-highest flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">person</span>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-surface-container bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">person</span>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-surface-container bg-surface-container flex items-center justify-center text-[10px] font-bold text-primary">
                    +5K
                  </div>
                </div>
                <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                  Usuarios Activos Hoy
                </span>
              </div>
            </div>

            {/* Community — vertical */}
            <div className="col-span-2 row-span-6 bg-surface-container rounded-xl p-8 flex flex-col border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-[120px]">groups</span>
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl">diversity_3</span>
                </div>
                <h3 className="text-2xl font-headline font-bold text-white mb-4">
                  Comunidad Académica
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
                  Conecta con compañeros de tu facultad. Comparte gastos y llega puntual.
                </p>
                <div className="mt-auto space-y-4">
                  <div className="bg-surface-container-high p-4 rounded-lg flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-medium text-on-surface">FISE: +12 viajes activos</span>
                  </div>
                  <div className="bg-surface-container-high p-4 rounded-lg flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-tertiary" />
                    <span className="text-xs font-medium text-on-surface">Campus Huachi: punto de encuentro</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Efficiency — wide bottom */}
            <div className="col-span-4 row-span-3 bg-gradient-primary rounded-xl p-8 flex items-center gap-8 relative overflow-hidden">
              <div className="absolute -bottom-4 -right-4 opacity-20">
                <span className="material-symbols-outlined text-[160px] text-on-primary">speed</span>
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-headline font-bold text-on-primary mb-2">
                  Máxima Eficiencia
                </h3>
                <p className="text-on-primary/80 font-medium">
                  Reduce tiempos de espera hasta en un 60% frente al transporte público.
                </p>
                <div className="mt-6 flex gap-4">
                  <div className="px-4 py-2 bg-on-primary/10 rounded-full border border-on-primary/20 text-on-primary font-bold text-xs uppercase tracking-tighter">
                    Rutas Inteligentes
                  </div>
                  <div className="px-4 py-2 bg-on-primary/10 rounded-full border border-on-primary/20 text-on-primary font-bold text-xs uppercase tracking-tighter">
                    Zero-Emission
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}

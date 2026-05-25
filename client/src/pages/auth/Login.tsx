import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const verified = searchParams.get('verified') === '1'
  const setAuth = useAuthStore((s) => s.setAuth)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await authApi.login(data)
      setAuth(res.data.user, res.data.accessToken)
      navigate('/trips')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.error ?? (err as any)?.response?.data?.message ??
        'Credenciales incorrectas'
      setServerError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      {/* Top Nav minimal */}
      <nav className="fixed top-0 w-full z-50 bg-[#0e0e0e]/80 backdrop-blur-md shadow-[0_0_32px_rgba(0,255,65,0.08)]">
        <div className="flex justify-between items-center px-8 py-4">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-white uppercase font-headline">
            U-Ride
          </Link>
          <Link
            to="/register"
            className="font-headline tracking-tight text-zinc-400 hover:text-white transition-colors text-sm"
          >
            Registrarse
          </Link>
        </div>
      </nav>

      <main className="pt-24 min-h-screen flex flex-col">
        {/* Hero Section */}
        <section className="relative px-6 py-12 md:px-24 md:py-24 flex flex-col md:flex-row items-center gap-12 overflow-hidden">
          {/* Background blobs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 -left-24 w-64 h-64 bg-tertiary/5 rounded-full blur-[80px]" />

          {/* Left: headline */}
          <div className="flex-1 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest border border-outline-variant/20 mb-6">
              <span
                className="material-symbols-outlined text-tertiary text-sm material-symbols-filled"
              >
                verified_user
              </span>
              <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                Solo correos universitarios permitidos
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-headline font-bold leading-[0.9] tracking-tighter text-on-surface mb-8">
              Transporte seguro para la{' '}
              <span className="text-primary italic">comunidad estudiantil</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-xl mb-10 leading-relaxed">
              U-Ride es la red exclusiva de transporte académico diseñada para conectar
              estudiantes en rutas seguras y eficientes.
            </p>
          </div>

          {/* Right: decorative campus block */}
          <div className="flex-1 relative w-full z-10 hidden md:block">
            <div className="w-full h-[400px] rounded-2xl overflow-hidden bg-surface-container-high flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-primary/30 text-[120px]">directions_car</span>
                <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest mt-4">
                  Campus UTA — Ambato
                </p>
              </div>
            </div>
            {/* Floating validation card */}
            <div className="absolute -bottom-6 -left-6 glass-panel p-6 rounded-xl border border-outline-variant/10 shadow-2xl max-w-xs">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary material-symbols-filled">security</span>
                </div>
                <div>
                  <div className="font-headline font-bold text-on-surface">Validación Institucional</div>
                  <div className="text-xs text-on-surface-variant">Acceso restringido por dominio</div>
                </div>
              </div>
              <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-primary rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Login + Benefits */}
        <section className="bg-surface-container-low px-6 py-20 md:px-24">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Login Panel */}
            <div className="lg:col-span-5 bg-surface-container p-8 md:p-12 rounded-2xl border border-outline-variant/5">
              <h2 className="text-3xl font-headline font-bold mb-2">Bienvenido de vuelta</h2>
              <p className="text-on-surface-variant mb-8">Ingresa con tu credencial institucional.</p>

              {verified && (
                <div className="mb-6 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
                  <span className="material-symbols-outlined text-primary text-lg material-symbols-filled">check_circle</span>
                  <span className="text-sm text-primary font-medium">
                    Email verificado. Ya puedes iniciar sesión.
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                    Correo Institucional
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                    placeholder="usuario@uta.edu.ec"
                    autoFocus
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-error">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                    Contraseña
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-error">{errors.password.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {serverError && (
                  <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-error text-sm">error</span>
                    <p className="text-sm text-error">{serverError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-primary text-on-primary py-4 rounded-lg font-headline font-bold text-lg active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,255,65,0.15)] hover:shadow-[0_4px_20px_rgba(0,255,65,0.25)] disabled:opacity-50"
                >
                  {isSubmitting ? 'Entrando...' : 'Iniciar Sesión'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
                <p className="text-on-surface-variant mb-4">¿No tienes una cuenta?</p>
                <Link
                  to="/register"
                  className="block w-full py-4 rounded-lg border border-outline-variant/20 font-headline font-bold text-on-surface hover:bg-surface-container-highest transition-all text-center"
                >
                  Registrarse como Estudiante
                </Link>
              </div>
            </div>

            {/* Benefits Bento Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Security */}
              <div className="bg-surface-container p-8 rounded-2xl flex flex-col justify-between group hover:bg-surface-container-high transition-all">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-12 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-3xl material-symbols-filled">shield</span>
                </div>
                <div>
                  <h3 className="text-2xl font-headline font-bold mb-3">Security First</h3>
                  <p className="text-on-surface-variant leading-relaxed">
                    Monitoreo en tiempo real y perfiles verificados únicamente por la administración universitaria.
                  </p>
                </div>
              </div>

              {/* Coordination */}
              <div className="bg-primary p-8 rounded-2xl flex flex-col justify-between group">
                <div className="w-14 h-14 rounded-xl bg-on-primary/10 flex items-center justify-center mb-12 group-hover:rotate-12 transition-transform">
                  <span className="material-symbols-outlined text-on-primary text-3xl">route</span>
                </div>
                <div>
                  <h3 className="text-2xl font-headline font-bold text-on-primary mb-3">Coordination</h3>
                  <p className="text-on-primary/80 font-medium leading-relaxed">
                    Rutas optimizadas entre facultades y zonas residenciales de Ambato.
                  </p>
                </div>
              </div>

              {/* Reputation — full width */}
              <div className="md:col-span-2 bg-tertiary/5 p-8 rounded-2xl flex flex-col md:flex-row gap-8 items-center border border-tertiary/20">
                <div className="flex-1">
                  <div className="w-14 h-14 rounded-xl bg-tertiary/10 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-tertiary text-3xl material-symbols-filled">military_tech</span>
                  </div>
                  <h3 className="text-2xl font-headline font-bold mb-3">Reputation &amp; Trust</h3>
                  <p className="text-on-surface-variant leading-relaxed">
                    Sistema de karma académico basado en puntualidad y respeto, con reseñas directas de compañeros.
                  </p>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="w-40 h-40 rounded-full bg-tertiary/10 border-4 border-surface flex items-center justify-center">
                    <span className="material-symbols-outlined text-tertiary text-[80px] material-symbols-filled">handshake</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Institutional trust */}
        <section className="py-12 px-6 text-center border-t border-white/5 bg-surface">
          <p className="font-label text-xs uppercase tracking-[0.3em] text-on-surface-variant mb-6">
            Red académica exclusiva UTA
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-30">
            <span className="text-2xl font-headline font-bold">UTA</span>
            <span className="text-2xl font-headline font-bold">FISE</span>
            <span className="text-2xl font-headline font-bold">FCA</span>
            <span className="text-2xl font-headline font-bold">FCEAH</span>
            <span className="text-2xl font-headline font-bold">FADU</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-8 bg-[#0e0e0e] border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col gap-2">
            <span className="font-headline font-bold text-primary text-2xl">U-Ride</span>
            <p className="font-label text-xs uppercase tracking-widest text-zinc-600">
              © 2024 U-Ride Institutional. Powered by Academic Kinetic.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 md:justify-end">
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Centro de Ayuda</span>
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Seguridad</span>
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Privacidad</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

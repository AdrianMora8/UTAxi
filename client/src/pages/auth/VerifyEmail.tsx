import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth.api'

const schema = z.object({
  code: z
    .string()
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d+$/, 'Solo números'),
})

type FormData = z.infer<typeof schema>

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [serverError, setServerError] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [isResending, setIsResending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ code }: FormData) => {
    setServerError('')
    try {
      await authApi.verifyEmail(email, code)
      navigate('/login?verified=1')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error ?? (err as any)?.response?.data?.message ??
        'Código inválido o expirado'
      setServerError(msg)
    }
  }

  const handleResendCode = async () => {
    setIsResending(true)
    setResendMessage('')
    setServerError('')
    try {
      await authApi.resendCode(email)
      setResendMessage('✓ Código reenviado exitosamente')
      setTimeout(() => setResendMessage(''), 5000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Error al reenviar el código'
      setServerError(msg)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col">
      {/* Background decorative blobs */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-tertiary/5 rounded-full blur-[100px]" />
      </div>

      <main className="flex-grow flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-12">

          {/* Branding */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-surface-container mb-2">
              <span className="material-symbols-outlined text-primary text-4xl material-symbols-filled">
                verified_user
              </span>
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tighter text-on-surface uppercase">
              Verifica tu cuenta
            </h1>
            <p className="text-on-surface-variant font-body text-sm max-w-[280px] mx-auto leading-relaxed">
              Hemos enviado un código de seguridad a{' '}
              <span className="text-primary font-medium">{email}</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            <div className="space-y-2">
              <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant ml-1 mb-4 text-center">
                Ingresa el código de 6 dígitos
              </label>
              <div className="relative group">
                <input
                  {...register('code')}
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  autoFocus
                  className="w-full h-24 bg-surface-container-highest border-none rounded-xl text-center font-headline text-5xl font-bold text-primary tracking-ultra-wide focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all duration-300 placeholder:text-surface-container-high outline-none"
                />
                {/* Glow on focus */}
                <div className="absolute inset-0 -z-10 bg-primary/5 blur-2xl rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              </div>
              {(errors.code || serverError) && (
                <p className="text-xs text-error text-center mt-2">
                  {errors.code?.message ?? serverError}
                </p>
              )}
            </div>

            <div className="space-y-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-primary py-5 rounded-xl text-on-primary font-headline font-bold text-lg uppercase tracking-tight shadow-[0_0_32px_rgba(0,255,65,0.08)] hover:shadow-[0_0_32px_rgba(0,255,65,0.15)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? 'Verificando...' : 'Verificar Código'}
              </button>

              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending || isSubmitting}
                  className="text-on-surface-variant hover:text-white font-label text-sm uppercase tracking-widest transition-colors duration-300 flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  {isResending ? 'Reenviando...' : 'Reenviar código'}
                </button>
                {resendMessage && (
                  <p className="text-xs text-green-400 text-center">
                    {resendMessage}
                  </p>
                )}
                <Link
                  to="/login"
                  className="text-zinc-600 hover:text-zinc-400 font-label text-xs uppercase tracking-widest transition-colors duration-300"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          </form>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-8 border-t border-white/5 bg-surface-dim">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-headline font-bold text-primary text-xl">U-Ride</span>
            <span className="text-zinc-700 hidden md:block">|</span>
            <p className="font-body text-[10px] uppercase tracking-widest text-zinc-600">
              © 2024 U-Ride Institutional. Powered by Academic Kinetic.
            </p>
          </div>
          <nav className="flex gap-6">
            <span className="font-body text-[10px] uppercase tracking-widest text-zinc-600">Privacidad</span>
            <span className="font-body text-[10px] uppercase tracking-widest text-zinc-600">Soporte</span>
            <span className="font-body text-[10px] uppercase tracking-widest text-zinc-600">Seguridad</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}

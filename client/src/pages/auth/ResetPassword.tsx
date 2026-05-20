import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api/auth.api'

const resetPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export default function ResetPassword() {
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const resetMutation = useMutation({
    mutationFn: (data: ResetPasswordForm) =>
      authApi.resetPassword({
        email: data.email,
        code: data.code,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    },
  })

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Background blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-24 w-64 h-64 bg-tertiary/5 rounded-full blur-[80px]" />

        <div className="bg-surface-container p-8 md:p-12 rounded-2xl border border-outline-variant/5 relative z-10">
          <h2 className="text-3xl font-headline font-bold mb-2 text-on-surface">Restablecer contraseña</h2>
          <p className="text-on-surface-variant mb-8">Ingresa el código que recibiste y tu nueva contraseña</p>

          {success && (
            <div className="mb-6 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
              <span className="text-sm text-primary font-medium">
                ✓ Contraseña restablecida correctamente. Redirigiendo...
              </span>
            </div>
          )}

          {resetMutation.isError && (
            <div className="mb-6 flex items-center gap-3 bg-error/10 border border-error/20 rounded-lg px-4 py-3">
              <span className="text-sm text-error font-medium">
                ✕ {(resetMutation.error as any)?.response?.data?.error || 'Error al restablecer la contraseña'}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit((data) => resetMutation.mutate(data))} className="space-y-6">
            <div>
              <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                Correo Institucional
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="usuario@uta.edu.ec"
                className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-error">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                Código de recuperación
              </label>
              <input
                {...register('code')}
                type="text"
                placeholder="000000"
                maxLength={6}
                className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline text-center font-mono text-lg tracking-widest"
                disabled={isSubmitting}
              />
              {errors.code && (
                <p className="mt-1 text-xs text-error">{errors.code.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                Nueva contraseña
              </label>
              <input
                {...register('newPassword')}
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                disabled={isSubmitting}
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-error">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                Confirmar contraseña
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder="Repite la contraseña"
                className="w-full bg-surface-container-highest border-none rounded-lg p-4 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all outline-none text-on-surface placeholder:text-outline"
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || resetMutation.isPending}
              className="w-full bg-primary text-on-primary font-semibold py-3 rounded-lg transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-headline tracking-tight"
            >
              {isSubmitting || resetMutation.isPending ? 'Procesando...' : 'Restablecer contraseña'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-outline-variant/10 pt-6">
            <p className="text-on-surface-variant text-sm mb-4">
              ¿No tienes el código?{' '}
              <Link to="/forgot-password" className="text-primary font-semibold hover:text-primary/80 transition-colors">
                Solicitar otro
              </Link>
            </p>
            <Link to="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors text-sm">
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2 text-slate-900">
            Restablecer contraseña
          </h1>
          <p className="text-center text-slate-600 mb-6 text-sm">
            Ingresa el código que recibiste y tu nueva contraseña
          </p>

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✓ Contraseña restablecida correctamente. Redirigiendo...
            </div>
          )}

          {resetMutation.isError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ✕ {(resetMutation.error as any)?.response?.data?.error || 'Error al restablecer la contraseña'}
            </div>
          )}

          <form onSubmit={handleSubmit((data) => resetMutation.mutate(data))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Correo institucional</label>
              <input
                {...register('email')}
                type="email"
                placeholder="tu.correo@uta.edu.ec"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50"
                disabled={isSubmitting}
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Código de recuperación</label>
              <input
                {...register('code')}
                type="text"
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 text-center font-mono text-lg tracking-widest"
                disabled={isSubmitting}
              />
              {errors.code && <p className="text-red-600 text-xs mt-1">{errors.code.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nueva contraseña</label>
              <input
                {...register('newPassword')}
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50"
                disabled={isSubmitting}
              />
              {errors.newPassword && <p className="text-red-600 text-xs mt-1">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirmar contraseña</label>
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder="Repite la contraseña"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50"
                disabled={isSubmitting}
              />
              {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || resetMutation.isPending}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || resetMutation.isPending ? 'Procesando...' : 'Restablecer contraseña'}
            </button>
          </form>

          <div className="mt-6 text-center border-t pt-4">
            <p className="text-slate-600 text-sm">
              ¿No tienes el código?{' '}
              <Link to="/forgot-password" className="text-primary font-semibold hover:underline">
                Solicitar otro
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-primary font-semibold hover:underline text-sm">
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

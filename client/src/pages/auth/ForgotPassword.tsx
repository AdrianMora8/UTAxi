import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api/auth.api'

const forgotPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const forgotMutation = useMutation({
    mutationFn: (data: ForgotPasswordForm) => authApi.forgotPassword(data),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => navigate('/reset-password'), 2000)
    },
  })

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Background blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-24 w-64 h-64 bg-tertiary/5 rounded-full blur-[80px]" />

        <div className="bg-surface-container p-8 md:p-12 rounded-2xl border border-outline-variant/5 relative z-10">
          <h2 className="text-3xl font-headline font-bold mb-2 text-on-surface">Recupera tu contraseña</h2>
          <p className="text-on-surface-variant mb-8">Ingresa tu correo institucional y recibirás un código para recuperar tu contraseña</p>

          {success && (
            <div className="mb-6 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
              <span className="text-sm text-primary font-medium">
                ✓ Correo enviado correctamente. Redirigiendo...
              </span>
            </div>
          )}

          {forgotMutation.isError && (
            <div className="mb-6 flex items-center gap-3 bg-error/10 border border-error/20 rounded-lg px-4 py-3">
              <span className="text-sm text-error font-medium">
                ✕ {(forgotMutation.error as any)?.response?.data?.error || 'Error al enviar el código'}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit((data) => forgotMutation.mutate(data))} noValidate className="space-y-6">
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

            <button
              type="submit"
              disabled={isSubmitting || forgotMutation.isPending}
              className="w-full bg-primary text-on-primary font-semibold py-3 rounded-lg transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-headline tracking-tight"
            >
              {isSubmitting || forgotMutation.isPending ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-outline-variant/10 pt-6">
            <p className="text-on-surface-variant text-sm mb-4">
              ¿Ya tienes el código?{' '}
              <Link to="/reset-password" className="text-primary font-semibold hover:text-primary/80 transition-colors">
                Ingrésalo aquí
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

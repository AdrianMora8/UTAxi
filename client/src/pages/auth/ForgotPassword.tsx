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
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2 text-slate-900">
            Recupera tu contraseña
          </h1>
          <p className="text-center text-slate-600 mb-6 text-sm">
            Ingresa tu correo institucional y recibirás un código para recuperar tu contraseña
          </p>

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✓ Correo enviado correctamente. Redirigiendo...
            </div>
          )}

          {forgotMutation.isError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ✕ {(forgotMutation.error as any)?.response?.data?.error || 'Error al enviar el código'}
            </div>
          )}

          <form onSubmit={handleSubmit((data) => forgotMutation.mutate(data))} className="space-y-4">
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

            <button
              type="submit"
              disabled={isSubmitting || forgotMutation.isPending}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || forgotMutation.isPending ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              ¿Ya tienes el código?{' '}
              <Link to="/reset-password" className="text-primary font-semibold hover:underline">
                Ingrésalo aquí
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center border-t pt-4">
            <Link to="/login" className="text-primary font-semibold hover:underline text-sm">
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

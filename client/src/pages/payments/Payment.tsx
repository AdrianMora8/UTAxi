import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { requestsApi } from '@/api/requests.api'
import { paymentsApi } from '@/api/payments.api'
import { StripeWrapper } from './StripeWrapper'
import { CardForm } from './CardForm'

export default function Payment() {
  const { requestId } = useParams<{ requestId: string }>()
  const navigate = useNavigate()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const { data: reqData, isLoading } = useQuery({
    queryKey: ['request-for-payment', requestId],
    queryFn: async () => {
      const all = await requestsApi.getMyRequests().then((r) => r.data.requests)
      return all.find((r) => r.id === requestId) ?? null
    },
    enabled: !!requestId,
  })

  const { data: existingPayment, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment', requestId],
    queryFn: () => paymentsApi.getPayment(requestId!).then((r) => r.data.payment),
    enabled: !!requestId,
    retry: false,
  })

  const createIntentMut = useMutation({
    mutationFn: () => paymentsApi.createIntent(requestId!),
    onSuccess: (res) => {
      setClientSecret(res.data.clientSecret)
      setPaymentError('')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error ?? (err as any)?.response?.data?.message ??
        'Error al iniciar el pago'
      setPaymentError(msg)
    },
  })

  if (isLoading || paymentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const req = reqData
  const trip = req?.trip
  const alreadyPaid = existingPayment?.status === 'CONFIRMED'

  if (!req || !trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <p className="text-on-surface-variant">Solicitud no encontrada.</p>
        <Link to="/requests" className="text-primary hover:underline text-sm">← Volver a mis solicitudes</Link>
      </div>
    )
  }

  if (alreadyPaid || confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-lg text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mx-auto">
            <span className="material-symbols-outlined text-primary text-5xl material-symbols-filled">
              check_circle
            </span>
          </div>
          <h1 className="font-headline text-4xl font-bold tracking-tighter text-white">
            ¡Pago Confirmado!
          </h1>
          <p className="text-on-surface-variant">
            Tu pago ha sido procesado exitosamente por Stripe.
          </p>
          <div className="bg-surface-container-low rounded-xl p-6 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Ruta</span>
              <span className="text-on-surface font-medium">
                {trip.originZone} → {trip.destinationZone}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Monto pagado</span>
              <span className="text-primary font-headline font-bold">${Number(trip.pricePerSeat).toFixed(2)}</span>
            </div>
          </div>
          <Link
            to="/requests"
            className="inline-block bg-gradient-primary text-on-primary px-8 py-3 rounded-lg font-headline font-bold"
          >
            Ver mis solicitudes
          </Link>
        </div>
      </div>
    )
  }

  const driverInitials = trip.driver
    ? trip.driver.fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('')
    : '?'

  const depTime = new Date(trip.departureTime).toLocaleString('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body flex flex-col">
      <main className="flex-grow flex items-center justify-center pt-6 pb-12 px-6">
        <div className="w-full max-w-lg space-y-8">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-tertiary/10 text-tertiary mb-4">
              <span className="material-symbols-outlined material-symbols-filled">shield_with_heart</span>
            </div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
              Pagar con Tarjeta
            </h1>
            <p className="text-on-surface-variant text-sm">
              Pago seguro procesado por Stripe.
            </p>
          </div>

          {/* Trip summary */}
          <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-2xl">
            <div className="h-28 relative bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant/10 text-[80px]">map</span>
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                <div>
                  <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Total a Pagar</p>
                  <h2 className="font-headline text-4xl font-extrabold text-white">
                    ${Number(trip.pricePerSeat).toFixed(2)}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-on-surface-variant text-[10px] uppercase tracking-tighter">ID Solicitud</p>
                  <p className="text-white font-mono text-sm">{req.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="w-0.5 h-6 bg-surface-container-highest" />
                  <div className="w-2 h-2 rounded-full bg-tertiary" />
                </div>
                <div className="flex-grow space-y-3">
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Origen</p>
                    <p className="text-sm font-medium">{trip.originZone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Destino</p>
                    <p className="text-sm font-medium">{trip.destinationZone}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-surface-container-highest flex items-center justify-center">
                    <span className="font-headline font-bold text-sm text-on-surface-variant">
                      {driverInitials}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">Conductor</p>
                    <p className="text-sm font-semibold">{trip.driver?.fullName ?? '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-on-surface-variant">Salida</p>
                  <p className="text-sm font-bold text-primary">{depTime}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stripe card form o botón para iniciar */}
          {!clientSecret ? (
            <div className="space-y-4">
              {paymentError && (
                <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                  <span className="material-symbols-outlined text-error text-sm">error</span>
                  <p className="text-sm text-error">{paymentError}</p>
                </div>
              )}
              <button
                onClick={() => createIntentMut.mutate()}
                disabled={createIntentMut.isPending}
                className="w-full bg-gradient-primary py-4 rounded-xl text-on-primary font-bold font-headline text-lg shadow-[0_4px_24px_rgba(0,252,64,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">credit_card</span>
                {createIntentMut.isPending ? 'Iniciando...' : 'Continuar con tarjeta'}
              </button>
              <Link
                to="/requests"
                className="block w-full text-center py-2 text-on-surface-variant hover:text-white transition-colors text-sm font-medium"
              >
                Cancelar
              </Link>
            </div>
          ) : (
            <StripeWrapper>
              <CardForm
                clientSecret={clientSecret}
                amount={Number(trip.pricePerSeat)}
                onSuccess={async () => {
                  try {
                    await paymentsApi.confirmCardPayment(requestId!)
                  } catch {
                    // el webhook lo procesará como fallback
                  }
                  setConfirmed(true)
                  setTimeout(() => navigate('/requests'), 3000)
                }}
                onError={(msg) => setPaymentError(msg)}
                isLoading={false}
              />
              {paymentError && (
                <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3 mt-4">
                  <span className="material-symbols-outlined text-error text-sm">error</span>
                  <p className="text-sm text-error">{paymentError}</p>
                </div>
              )}
            </StripeWrapper>
          )}

          {/* Test mode hint */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 rounded-lg border border-primary/10">
            <span className="material-symbols-outlined text-primary text-xl">info</span>
            <div className="text-xs text-on-surface-variant">
              <span className="text-primary font-bold">Modo prueba</span> — usa la tarjeta{' '}
              <span className="font-mono text-white">4242 4242 4242 4242</span>, cualquier fecha futura y cualquier CVV.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useNotifications } from '@/hooks/useNotifications'
import type {
  TripStartedPayload,
  TripCompletedPassengerPayload,
  TripCompletedDriverPayload,
  TripCancelledByDriverPayload,
  NoShowPayload,
  ScheduleChangedPayload,
} from '@/hooks/useNotifications'

interface Toast {
  id: number
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  action?: { label: string; onClick: () => void }
}

let toastId = 0

export default function GlobalNotifications() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((
    message: string,
    type: Toast['type'] = 'info',
    action?: Toast['action'],
  ) => {
    const id = ++toastId
    setToasts((prev) => [...prev.slice(-3), { id, message, type, action }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000)
  }, [])

  const onTripStarted = useCallback((p: TripStartedPayload) => {
    qc.invalidateQueries({ queryKey: ['trip', p.tripId] })
    qc.invalidateQueries({ queryKey: ['my-requests'] })
    addToast(
      `¡El viaje ha iniciado! ${p.originZone} → ${p.destinationZone}`,
      'success',
      { label: 'Ver mapa', onClick: () => navigate(`/trips/${p.tripId}/active`) },
    )
  }, [qc, addToast, navigate])

  const onTripCompletedPassenger = useCallback((p: TripCompletedPassengerPayload) => {
    qc.invalidateQueries({ queryKey: ['my-requests'] })
    qc.invalidateQueries({ queryKey: ['wallet'] })
    addToast(
      `¡Viaje completado! ${p.originZone} → ${p.destinationZone}`,
      'success',
      { label: 'Calificar conductor', onClick: () => navigate('/requests') },
    )
    // Small delay so the query re-fetches before navigating
    setTimeout(() => navigate('/requests'), 800)
  }, [qc, addToast, navigate])

  const onTripCompletedDriver = useCallback((p: TripCompletedDriverPayload) => {
    qc.invalidateQueries({ queryKey: ['my-trips'] })
    qc.invalidateQueries({ queryKey: ['wallet'] })
    addToast(
      `¡Viaje completado! Tus ganancias han sido acreditadas.`,
      'success',
      { label: 'Ver mis viajes', onClick: () => navigate('/my-trips') },
    )
    setTimeout(() => navigate('/my-trips'), 800)
  }, [qc, addToast, navigate])

  const onTripCancelledByDriver = useCallback((p: TripCancelledByDriverPayload) => {
    qc.invalidateQueries({ queryKey: ['my-requests'] })
    qc.invalidateQueries({ queryKey: ['wallet'] })
    const refundMsg = p.refundAmount > 0
      ? ` Se reembolsaron $${p.refundAmount.toFixed(2)} a tu U-Wallet.`
      : ''
    addToast(
      `Tu viaje ${p.originZone} → ${p.destinationZone} fue cancelado por el conductor.${refundMsg}`,
      'error',
    )
    navigate('/requests')
  }, [qc, addToast, navigate])

  const onNoShow = useCallback((p: NoShowPayload) => {
    qc.invalidateQueries({ queryKey: ['my-requests'] })
    const msg = p.refunded
      ? `Tu reserva fue cancelada (no te presentaste). Se reembolsó tu pago.`
      : `Tu reserva fue cancelada por no presentarte al viaje ${p.originZone} → ${p.destinationZone}.`
    addToast(msg, 'warning')
  }, [qc, addToast])

  const onScheduleChanged = useCallback((p: ScheduleChangedPayload) => {
    qc.invalidateQueries({ queryKey: ['my-requests'] })
    qc.invalidateQueries({ queryKey: ['trip', p.tripId] })
    const oldTime = new Date(p.oldTime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true })
    const newTime = new Date(p.newTime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true })
    addToast(
      `El conductor cambió el horario: ${oldTime} → ${newTime}. ${p.bigChange ? '¡Cambio significativo!' : ''}`,
      'warning',
    )
  }, [qc, addToast])

  useNotifications({
    onTripStarted,
    onTripCompletedPassenger,
    onTripCompletedDriver,
    onTripCancelledByDriver,
    onNoShow,
    onScheduleChanged,
  })

  const ICONS: Record<Toast['type'], string> = {
    info: 'notifications',
    success: 'check_circle',
    warning: 'warning',
    error: 'cancel',
  }

  const COLORS: Record<Toast['type'], string> = {
    info: 'border-primary/30 text-primary',
    success: 'border-tertiary/30 text-tertiary',
    warning: 'border-yellow-500/30 text-yellow-400',
    error: 'border-error/30 text-error',
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center w-full max-w-md px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`w-full bg-surface-container-highest border backdrop-blur-md px-5 py-3 rounded-xl shadow-2xl flex items-start gap-3 ${COLORS[toast.type]}`}
        >
          <span className={`material-symbols-outlined text-lg flex-shrink-0 mt-0.5 material-symbols-filled`}>
            {ICONS[toast.type]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold leading-snug">{toast.message}</p>
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="text-xs font-bold uppercase tracking-widest mt-1 opacity-70 hover:opacity-100 transition-opacity"
              >
                {toast.action.label} →
              </button>
            )}
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="material-symbols-outlined text-sm opacity-40 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            close
          </button>
        </div>
      ))}
    </div>
  )
}

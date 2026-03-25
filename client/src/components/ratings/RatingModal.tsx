import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ratingsApi } from '@/api/ratings.api'

interface RatingModalProps {
  tripRequestId: string
  driverName: string
  onClose: () => void
}

export default function RatingModal({ tripRequestId, driverName, onClose }: RatingModalProps) {
  const [score, setScore] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [serverError, setServerError] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => ratingsApi.createRating({ tripRequestId, score, comment: comment || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-requests'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al enviar la calificación'
      setServerError(msg)
    },
  })

  const displayScore = hovered || score

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-surface-container-low rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-headline text-xl font-bold text-white">Calificar Conductor</h2>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <p className="text-on-surface-variant text-sm">{driverName}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Stars */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">
              {displayScore === 0
                ? 'Selecciona una puntuación'
                : displayScore === 1 ? 'Muy malo'
                : displayScore === 2 ? 'Regular'
                : displayScore === 3 ? 'Bueno'
                : displayScore === 4 ? 'Muy bueno'
                : 'Excelente'}
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setScore(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <span
                    className={`material-symbols-outlined text-4xl transition-colors ${
                      star <= displayScore
                        ? 'text-primary material-symbols-filled'
                        : 'text-outline'
                    }`}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Comentario <span className="normal-case text-zinc-600">(opcional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="¿Cómo fue tu experiencia con este conductor?"
              className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-on-surface placeholder:text-outline text-sm resize-none focus:ring-1 focus:ring-primary/40 outline-none"
            />
          </div>

          {serverError && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-error text-sm">error</span>
              <p className="text-sm text-error">{serverError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => mutation.mutate()}
              disabled={score === 0 || mutation.isPending}
              className="w-full bg-gradient-primary py-3 rounded-xl text-on-primary font-headline font-bold uppercase tracking-wider transition-all hover:shadow-[0_0_20px_rgba(156,255,147,0.3)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {mutation.isPending ? 'Enviando...' : 'Enviar Calificación'}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-on-surface-variant hover:text-white text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

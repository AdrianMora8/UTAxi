import { useState, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { reportsApi, type ReportReason } from '@/api/reports.api'

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: 'INAPPROPRIATE_BEHAVIOR', label: 'Comportamiento inapropiado' },
  { value: 'NO_SHOW', label: 'No se presentó al viaje' },
  { value: 'UNSAFE_DRIVING', label: 'Conducción peligrosa / Inseguridad' },
  { value: 'FRAUD', label: 'Fraude o problema con el pago' },
  { value: 'HARASSMENT', label: 'Hostigamiento o acoso' },
  { value: 'OTHER', label: 'Otro motivo' },
]

export default function Report() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const reportedId   = searchParams.get('userId') ?? ''
  const reportedName = searchParams.get('name') ?? 'Usuario'

  const [reason, setReason] = useState<ReportReason | ''>('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('reportedId', reportedId)
      fd.append('reason', reason as string)
      fd.append('description', description)
      if (file) fd.append('evidence', file)
      return reportsApi.createReport(fd)
    },
    onSuccess: () => setDone(true),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error ?? (err as any)?.response?.data?.message ??
        'Error al enviar el reporte'
      setServerError(msg)
    },
  })

  const reportedInitials = reportedName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')

  if (done) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-tertiary/10 mx-auto">
            <span className="material-symbols-outlined text-tertiary text-5xl material-symbols-filled">
              shield_with_heart
            </span>
          </div>
          <h1 className="font-headline text-3xl font-bold text-white">Reporte Enviado</h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Tu reporte será revisado por el equipo de Seguridad Kinetic en un plazo máximo de 24 horas hábiles.
          </p>
          <Link
            to="/trips"
            className="inline-block bg-gradient-primary text-on-primary px-8 py-3 rounded-lg font-headline font-bold"
          >
            Volver a viajes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <main className="pt-8 pb-20 px-6 flex justify-center">
        <div className="w-full max-w-lg space-y-10">

          {/* Header */}
          <header className="text-center space-y-2">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-white uppercase">
              Reportar Usuario
            </h1>
            <p className="text-on-surface-variant text-sm tracking-widest uppercase">
              Seguridad Institucional
            </p>
          </header>

          {/* Reported user card */}
          <section className="bg-surface-container-low p-6 rounded-xl border border-white/5 flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="font-headline font-bold text-2xl text-on-surface-variant">
                  {reportedInitials}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-error rounded-full flex items-center justify-center border-2 border-surface-container-low">
                <span className="material-symbols-outlined text-[14px] text-white">warning</span>
              </div>
            </div>
            <div>
              <h2 className="font-headline text-2xl font-bold text-white tracking-tight">
                {reportedName}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-primary text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Estudiante Verificado
              </div>
            </div>
          </section>

          {/* Form */}
          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault()
              if (!reason || description.length < 10) return
              setServerError('')
              mutation.mutate()
            }}
          >
            {/* Reason */}
            <div className="space-y-2">
              <label className="block font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                Motivo del Reporte
              </label>
              <div className="relative">
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-5 text-on-surface focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer outline-none"
                >
                  <option value="" disabled>Selecciona una opción</option>
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                  <span className="material-symbols-outlined">expand_more</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                Descripción de los hechos
              </label>
              <textarea
                required
                minLength={10}
                maxLength={1000}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe detalladamente lo ocurrido..."
                className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-5 text-on-surface focus:ring-1 focus:ring-primary/40 placeholder:text-zinc-600 resize-none outline-none"
              />
              <p className="text-right text-xs text-outline">{description.length}/1000</p>
            </div>

            {/* Evidence upload */}
            <div className="space-y-2">
              <label className="block font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                Evidencia Fotográfica
              </label>
              <div
                className="group relative border-2 border-dashed border-outline-variant hover:border-primary/40 transition-colors rounded-xl p-10 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest/30 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-3xl material-symbols-filled">image</span>
                    </div>
                    <div className="text-center">
                      <p className="text-on-surface font-medium text-sm">{file.name}</p>
                      <p className="text-on-surface-variant text-xs mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                      className="text-error text-xs hover:underline"
                    >
                      Eliminar
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                      <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                    </div>
                    <div className="text-center">
                      <p className="text-on-surface font-medium">Click para subir o arrastra archivos</p>
                      <p className="text-on-surface-variant text-xs mt-1 uppercase tracking-tighter">
                        PNG, JPG hasta 10MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {serverError && (
              <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                <span className="material-symbols-outlined text-error text-sm">error</span>
                <p className="text-sm text-error">{serverError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-4">
              <button
                type="submit"
                disabled={mutation.isPending || !reason || description.length < 10}
                className="w-full bg-gradient-primary py-4 rounded-xl text-on-primary font-headline font-bold uppercase tracking-widest text-lg shadow-[0_0_24px_rgba(0,252,64,0.15)] hover:shadow-[0_0_32px_rgba(0,252,64,0.3)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? 'Enviando...' : 'Enviar Reporte'}
              </button>
              <Link
                to="/trips"
                className="w-full py-4 rounded-xl text-on-surface-variant font-headline font-bold uppercase tracking-widest text-center hover:text-white hover:bg-white/5 transition-all"
              >
                Cancelar
              </Link>
            </div>
          </form>

          {/* Info box */}
          <div className="bg-tertiary/5 border-l-4 border-tertiary p-4 rounded-r-lg flex gap-4">
            <span className="material-symbols-outlined text-tertiary material-symbols-filled flex-shrink-0">info</span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Tu reporte será revisado por el equipo de Seguridad Kinetic en un plazo máximo de 24 horas hábiles. Toda información compartida es estrictamente confidencial bajo los términos de privacidad universitaria.
            </p>
          </div>

        </div>
      </main>

      <footer className="w-full py-12 px-8 bg-[#0e0e0e] border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="font-headline font-bold text-primary text-xl">U-Ride</span>
            <p className="font-label text-xs uppercase tracking-widest text-zinc-600 mt-4">
              © 2024 U-Ride Institutional. Powered by Academic Kinetic.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 md:justify-end">
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Privacidad</span>
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Soporte</span>
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Seguridad</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

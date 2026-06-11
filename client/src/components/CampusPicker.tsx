import { CAMPUSES, type Campus } from '@/constants/campuses'

interface Props {
  value: Campus | null
  onChange: (campus: Campus) => void
  error?: string
}

export default function CampusPicker({ value, onChange, error }: Props) {
  return (
    <div className="space-y-2">
      {CAMPUSES.map((campus) => {
        const selected = value?.id === campus.id
        return (
          <button
            key={campus.id}
            type="button"
            onClick={() => onChange(campus)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
              selected
                ? 'border-primary bg-primary/5'
                : 'border-white/5 bg-surface-container-highest hover:border-white/15'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                selected ? 'bg-primary' : 'bg-surface-container'
              }`}
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  selected ? 'text-on-primary' : 'text-on-surface-variant'
                }`}
              >
                school
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${selected ? 'text-white' : 'text-on-surface-variant'}`}>
                {campus.label}
              </p>
              <p className="text-xs text-zinc-500 truncate">{campus.description}</p>
            </div>
            {selected && (
              <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">
                check_circle
              </span>
            )}
          </button>
        )
      })}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}

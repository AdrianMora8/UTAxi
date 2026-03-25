import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <span className="material-symbols-outlined text-primary/30 text-[100px] mb-6">directions_car</span>
      <h1 className="text-4xl font-headline font-bold tracking-tighter mb-3">
        Bienvenido, <span className="text-primary">{user?.fullName.split(' ')[0]}</span>
      </h1>
      <p className="text-on-surface-variant mb-8 max-w-sm">
        Pronto podrás buscar y publicar viajes. En construcción.
      </p>
      <Link
        to="/profile"
        className="bg-gradient-primary text-on-primary px-6 py-3 rounded-lg font-headline font-bold text-sm hover:shadow-[0_0_20px_rgba(156,255,147,0.3)] transition-all"
      >
        Ver mi perfil
      </Link>
    </div>
  )
}

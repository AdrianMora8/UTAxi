import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from '@/api/payments.api'

const CONCEPT_LABEL: Record<string, { text: string; icon: string }> = {
  TOPUP:            { text: 'Recarga',          icon: 'add_circle' },
  PAYMENT:          { text: 'Pago de viaje',    icon: 'directions_car' },
  REFUND:           { text: 'Reembolso',         icon: 'undo' },
  CANCELLATION_FEE: { text: 'Penalización',      icon: 'warning' },
  TRIP_EARNING:     { text: 'Ganancia',          icon: 'payments' },
}

export default function Wallet() {
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const qc = useQueryClient()

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentsApi.getWallet().then((r) => r.data),
  })

  const topUpMut = useMutation({
    mutationFn: (amount: number) => paymentsApi.topUp(amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] })
      setTopUpOpen(false)
      setTopUpAmount('')
      showToast('Saldo recargado exitosamente')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showToast(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Error al recargar', false)
    },
  })

  const handleTopUp = () => {
    const amount = parseFloat(topUpAmount)
    if (!amount || amount <= 0 || amount > 500) {
      showToast('Ingresa un monto entre $0.01 y $500', false)
      return
    }
    topUpMut.mutate(amount)
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <main className="pt-6 pb-20 px-6 md:px-12 lg:px-24 max-w-5xl mx-auto">

        <header className="mb-12">
          <span className="text-primary font-label text-xs font-bold tracking-[0.2em] uppercase mb-2 block">
            Pagos
          </span>
          <h2 className="text-5xl md:text-6xl font-headline font-bold tracking-tighter text-white leading-none">
            U-Wallet
          </h2>
        </header>

        {/* Balance card */}
        <div className="relative bg-surface-container rounded-2xl overflow-hidden mb-10 shadow-xl">
          <div className="absolute inset-0 opacity-5">
            <span className="material-symbols-outlined text-[300px] text-primary leading-none -translate-x-1/4 -translate-y-1/4 select-none">
              account_balance_wallet
            </span>
          </div>
          <div className="relative p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">
                Saldo disponible
              </p>
              {isLoading ? (
                <div className="h-14 w-40 bg-surface-container-high animate-pulse rounded-lg" />
              ) : (
                <p className="text-6xl font-headline font-extrabold text-white">
                  ${data?.walletBalance.toFixed(2) ?? '0.00'}
                </p>
              )}
              {!isLoading && (data?.pendingBalance ?? 0) > 0 && (
                <p className="text-sm text-on-surface-variant mt-2">
                  <span className="text-yellow-400 font-bold">${data!.pendingBalance.toFixed(2)}</span>
                  {' '}pendiente de acreditación
                </p>
              )}
            </div>
            <button
              onClick={() => setTopUpOpen(true)}
              className="flex items-center gap-2 bg-gradient-primary text-on-primary font-headline font-bold py-4 px-8 rounded-xl text-sm uppercase tracking-tighter hover:shadow-[0_0_24px_rgba(156,255,147,0.4)] transition-all active:scale-95 self-start md:self-center"
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              Recargar Saldo
            </button>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h3 className="text-lg font-headline font-bold text-white mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            Historial de movimientos
          </h3>

          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-surface-container-low rounded-xl mb-3 animate-pulse" />
            ))
          ) : !data?.transactions.length ? (
            <div className="flex flex-col items-center py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-zinc-600 mb-4">receipt_long</span>
              <p className="text-on-surface-variant">Sin movimientos aún.</p>
              <p className="text-xs text-zinc-600 mt-1">Recarga tu saldo para empezar a usar U-Wallet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.transactions.map((tx) => {
                const meta = CONCEPT_LABEL[tx.concept] ?? { text: tx.concept, icon: 'swap_horiz' }
                const isCredit = tx.type === 'CREDIT'
                const date = new Date(tx.createdAt).toLocaleString('es-EC', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
                const isCard = tx.concept === 'PAYMENT' && tx.description?.includes('(tarjeta)')
                const isWallet = tx.concept === 'PAYMENT' && tx.description?.includes('(U-Wallet)')
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between bg-surface-container-low rounded-xl px-5 py-4 hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isCredit ? 'bg-tertiary/10' : 'bg-error/10'
                      }`}>
                        <span className={`material-symbols-outlined text-lg ${
                          isCredit ? 'text-tertiary' : 'text-error'
                        }`}>
                          {meta.icon}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{meta.text}</p>
                          {isCard && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 uppercase tracking-wide">
                              Tarjeta
                            </span>
                          )}
                          {isWallet && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wide">
                              Wallet
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant truncate max-w-[200px]">
                          {tx.description?.replace(' (tarjeta)', '').replace(' (U-Wallet)', '')}
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{date}</p>
                      </div>
                    </div>
                    <p className={`text-lg font-headline font-extrabold ${
                      isCredit ? 'text-tertiary' : 'text-error'
                    }`}>
                      {isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Top-up modal */}
      {topUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-surface-container-low rounded-2xl w-full max-w-sm p-8 shadow-2xl border border-white/5">
            <h3 className="font-headline font-bold text-xl text-white mb-2">Recargar U-Wallet</h3>
            <p className="text-on-surface-variant text-sm mb-6">Ingresa el monto a recargar (máx. $500)</p>

            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">$</span>
              <input
                type="number"
                min="0.01"
                max="500"
                step="0.01"
                placeholder="0.00"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTopUp()}
                className="w-full bg-surface-container-high border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white text-2xl font-headline font-bold focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setTopUpOpen(false); setTopUpAmount('') }}
                className="flex-1 py-3 rounded-xl text-on-surface-variant border border-white/10 hover:text-white transition-colors text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleTopUp}
                disabled={topUpMut.isPending}
                className="flex-1 py-3 rounded-xl bg-gradient-primary text-on-primary font-headline font-bold text-sm uppercase tracking-tighter hover:shadow-[0_0_20px_rgba(156,255,147,0.3)] transition-all active:scale-95 disabled:opacity-50"
              >
                {topUpMut.isPending ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 border px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 ${
          toast.ok
            ? 'bg-surface-container-highest border-primary/30 text-white'
            : 'bg-error/10 border-error/30 text-error'
        }`}>
          <span className={`material-symbols-outlined text-lg ${toast.ok ? 'text-primary' : 'text-error'}`}>
            {toast.ok ? 'check_circle' : 'error'}
          </span>
          <span className="text-sm font-bold">{toast.msg}</span>
        </div>
      )}
    </div>
  )
}

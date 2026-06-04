import { useState } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Stripe, StripeElements } from '@stripe/stripe-js'

interface CardFormProps {
  clientSecret: string
  amount: number
  onSuccess: () => void
  onError: (error: string) => void
  isLoading: boolean
}

export function CardForm({ clientSecret, amount, onSuccess, onError, isLoading }: CardFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardError, setCardError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      onError('Stripe no está cargado')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      onError('Elemento de tarjeta no encontrado')
      return
    }

    try {
      // Crear método de pago con la tarjeta
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (error) {
        setCardError(error.message || 'Error al procesar la tarjeta')
        onError(error.message || 'Error desconocido')
        return
      }

      // Confirmar el pago
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod?.id,
      })

      if (confirmError) {
        setCardError(confirmError.message || 'Error al confirmar el pago')
        onError(confirmError.message || 'Error desconocido')
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        onSuccess()
      } else if (paymentIntent?.status === 'requires_action') {
        onError('Se requiere autenticación adicional. Completa en el popup.')
      } else {
        onError(`Estado inesperado del pago: ${paymentIntent?.status}`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      onError(errorMsg)
      setCardError(errorMsg)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#e8e8e8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#d32f2f',
      },
    },
    hidePostalCode: false,
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-surface-container-high rounded-lg p-4 border border-white/10">
        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
          Detalles de Tarjeta (Stripe)
        </label>
        <CardElement options={cardElementOptions} />
      </div>

      {cardError && (
        <div className="bg-error/10 border border-error rounded-lg p-3">
          <p className="text-error text-sm">{cardError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-gradient-primary text-on-primary font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Procesando...
          </span>
        ) : (
          `Pagar $${amount.toFixed(2)}`
        )}
      </button>

      <p className="text-[10px] text-on-surface-variant text-center">
        Tu tarjeta será procesada de forma segura por Stripe.
      </p>
    </form>
  )
}

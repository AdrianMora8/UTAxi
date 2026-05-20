import { ReactNode } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder')

interface StripeWrapperProps {
  children: ReactNode
}

export function StripeWrapper({ children }: StripeWrapperProps) {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  )
}

import { useState } from 'react';
import { Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { paymentsApi } from '../api/payments.api';

export function useStripePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  async function payWithCard(
    tripRequestId: string,
    onSuccess: () => void,
  ) {
    setLoading(true);
    try {
      const res = await paymentsApi.createIntent(tripRequestId);
      const { clientSecret } = res.data;

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'UTAxi',
        style: 'alwaysDark',
        appearance: {
          colors: {
            primary: '#9CFF93',
            background: '#1a1a1a',
            componentBackground: '#242424',
            componentBorder: '#333333',
            componentDivider: '#333333',
            primaryText: '#ffffff',
            secondaryText: '#aaaaaa',
            componentText: '#ffffff',
            placeholderText: '#666666',
            icon: '#aaaaaa',
            error: '#ff6b4a',
          },
        },
        defaultBillingDetails: {
          name: 'Estudiante UTA',
        },
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Pago fallido', presentError.message);
        }
        return;
      }

      // Confirmar en backend: crea WalletTransaction + marca pago CONFIRMED
      await paymentsApi.confirmCardPayment(tripRequestId);
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Error al procesar el pago';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return { payWithCard, loading };
}

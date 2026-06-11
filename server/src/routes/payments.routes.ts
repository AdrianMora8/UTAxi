import { Router, raw } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createIntent,
  handleWebhook,
  getPayment,
  simulateConfirm,
  payWithWallet,
  getWallet,
  topUpWallet,
  confirmCardPayment,
  markAsCash,
  confirmCashPayment,
  getTripPaymentStatus,
} from '../controllers/payments.controller';

export const paymentsRouter = Router();

// Webhook de Stripe — necesita el body RAW (sin parsear), sin autenticación JWT
paymentsRouter.post('/webhook', raw({ type: 'application/json' }), handleWebhook);

// Wallet
paymentsRouter.get('/wallet', requireAuth, getWallet);
paymentsRouter.post('/wallet/topup', requireAuth, topUpWallet);

// Pago con wallet (puerta abierta: Stripe usa /create-intent)
paymentsRouter.post('/pay/wallet', requireAuth, payWithWallet);

// Stripe
paymentsRouter.post('/create-intent', requireAuth, createIntent);
paymentsRouter.post('/confirm-card', requireAuth, confirmCardPayment);

// Efectivo
paymentsRouter.post('/pay/cash', requireAuth, markAsCash);
paymentsRouter.post('/confirm-cash', requireAuth, confirmCashPayment);

// Estado de pagos del viaje (conductor)
paymentsRouter.get('/trip/:tripId/status', requireAuth, getTripPaymentStatus);
paymentsRouter.post('/simulate-confirm', requireAuth, simulateConfirm);
paymentsRouter.get('/:tripRequestId', requireAuth, getPayment);

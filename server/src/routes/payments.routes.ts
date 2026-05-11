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
} from '../controllers/payments.controller';

export const paymentsRouter = Router();

// Webhook de Stripe — necesita el body RAW (sin parsear), sin autenticación JWT
paymentsRouter.post('/webhook', raw({ type: 'application/json' }), handleWebhook);

// Wallet
paymentsRouter.get('/wallet', requireAuth, getWallet);
paymentsRouter.post('/wallet/topup', requireAuth, topUpWallet);

// Pago con wallet (puerta abierta: Stripe usa /create-intent)
paymentsRouter.post('/pay/wallet', requireAuth, payWithWallet);

// Stripe (existente)
paymentsRouter.post('/create-intent', requireAuth, createIntent);
paymentsRouter.post('/simulate-confirm', requireAuth, simulateConfirm);
paymentsRouter.get('/:tripRequestId', requireAuth, getPayment);

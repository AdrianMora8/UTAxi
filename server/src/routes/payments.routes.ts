import { Router, raw } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createIntent, handleWebhook, getPayment } from '../controllers/payments.controller';

export const paymentsRouter = Router();

// Webhook de Stripe — necesita el body RAW (sin parsear), sin autenticación JWT
paymentsRouter.post('/webhook', raw({ type: 'application/json' }), handleWebhook);

// Rutas protegidas
paymentsRouter.post('/create-intent', requireAuth, createIntent);
paymentsRouter.get('/:tripRequestId', requireAuth, getPayment);

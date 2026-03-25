import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { PaymentsService } from '../services/payments.service';

const svc = new PaymentsService(prisma, stripe);

const createIntentSchema = z.object({
  tripRequestId: z.string().min(1),
});

const simulateSchema = z.object({
  tripRequestId: z.string().min(1),
});

export async function createIntent(req: Request, res: Response) {
  const { tripRequestId } = createIntentSchema.parse(req.body);
  const result = await svc.createIntent(tripRequestId, req.user!.id);
  res.status(201).json(result);
}

export async function handleWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'] as string;
  const result = await svc.handleWebhook(req.body as Buffer, signature, env.STRIPE_WEBHOOK_SECRET);
  res.json(result);
}

export async function getPayment(req: Request, res: Response) {
  const payment = await svc.getByTripRequest(String(req.params.tripRequestId), req.user!.id);
  res.json({ payment });
}

export async function simulateConfirm(req: Request, res: Response) {
  const { tripRequestId } = simulateSchema.parse(req.body);
  const result = await svc.simulateConfirm(tripRequestId, req.user!.id);
  res.status(201).json(result);
}

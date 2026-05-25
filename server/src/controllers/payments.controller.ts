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

const payWithWalletSchema = z.object({
  tripRequestId: z.string().min(1),
});

const topUpSchema = z.object({
  amount: z.number().positive().max(500),
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

export async function payWithWallet(req: Request, res: Response) {
  const { tripRequestId } = payWithWalletSchema.parse(req.body);
  const result = await svc.payWithWallet(tripRequestId, req.user!.id);
  res.status(201).json(result);
}

export async function confirmCardPayment(req: Request, res: Response) {
  const { tripRequestId } = z.object({ tripRequestId: z.string().min(1) }).parse(req.body);
  const result = await svc.confirmCardPayment(tripRequestId, req.user!.id);
  res.json(result);
}

export async function markAsCash(req: Request, res: Response) {
  const { tripRequestId } = z.object({ tripRequestId: z.string().min(1) }).parse(req.body);
  const result = await svc.markAsCash(tripRequestId, req.user!.id);
  res.json(result);
}

export async function confirmCashPayment(req: Request, res: Response) {
  const { tripRequestId } = z.object({ tripRequestId: z.string().min(1) }).parse(req.body);
  const result = await svc.confirmCashPayment(tripRequestId, req.user!.id);
  res.json(result);
}

export async function getTripPaymentStatus(req: Request, res: Response) {
  const result = await svc.getTripPaymentStatus(String(req.params.tripId), req.user!.id);
  res.json({ passengers: result });
}

export async function getWallet(req: Request, res: Response) {
  const result = await svc.getWallet(req.user!.id);
  res.json(result);
}

export async function topUpWallet(req: Request, res: Response) {
  const { amount } = topUpSchema.parse(req.body);
  const result = await svc.topUpWallet(req.user!.id, amount);
  res.json(result);
}

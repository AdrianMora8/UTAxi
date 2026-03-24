import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { RequestsService } from '../services/requests.service';

const svc = new RequestsService(prisma);

const createRequestSchema = z.object({
  message: z.string().max(300).optional(),
});

const respondSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT']),
});

export async function createRequest(req: Request, res: Response) {
  const { message } = createRequestSchema.parse(req.body);
  const request = await svc.create(String(req.params.tripId), req.user!.id, message);
  res.status(201).json({ request });
}

export async function getRequestsByTrip(req: Request, res: Response) {
  const requests = await svc.getByTrip(String(req.params.tripId), req.user!.id);
  res.json({ requests });
}

export async function respondToRequest(req: Request, res: Response) {
  const { action } = respondSchema.parse(req.body);
  const request = await svc.respond(String(req.params.id), req.user!.id, action);
  res.json({ request });
}

export async function cancelRequest(req: Request, res: Response) {
  const result = await svc.cancelRequest(String(req.params.id), req.user!.id);
  res.json(result);
}

export async function getMyRequests(req: Request, res: Response) {
  const requests = await svc.getMyRequests(req.user!.id);
  res.json({ requests });
}

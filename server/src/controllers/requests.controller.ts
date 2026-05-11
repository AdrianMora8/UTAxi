import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { RequestsService } from '../services/requests.service';
import { emitToTrip, emitToUser } from '../socket/tracking.gateway';

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

  // Notificar al conductor en tiempo real
  const trip = await prisma.trip.findUnique({ where: { id: String(req.params.tripId) } });
  if (trip) {
    emitToUser(trip.driverId, 'request:new', {
      requestId: request.id,
      tripId: trip.id,
      passengerName: (request as any).passenger?.fullName ?? 'Pasajero',
    });
  }

  res.status(201).json({ request });
}

export async function getRequestsByTrip(req: Request, res: Response) {
  const requests = await svc.getByTrip(String(req.params.tripId), req.user!.id);
  res.json({ requests });
}

export async function respondToRequest(req: Request, res: Response) {
  const { action } = respondSchema.parse(req.body);
  const request = await svc.respond(String(req.params.id), req.user!.id, action);

  const tripId = (request as any).tripId ?? (request as any).trip?.id;
  const payload = {
    requestId: request.id,
    tripId,
    status: request.status,
    rejectionCount: (request as any).rejectionCount ?? 0,
  };

  // Notificar al pasajero directamente via su sala personal
  emitToUser((request as any).passengerId, 'request:update', payload);
  // Notificar también a la sala del viaje (por si el pasajero está en TripDetail)
  emitToTrip(tripId, 'request:update', payload);

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

export async function markArrival(req: Request, res: Response) {
  const { arrived } = z.object({ arrived: z.boolean() }).parse(req.body);
  const request = await svc.markArrival(String(req.params.id), req.user!.id, arrived);
  res.json({ request });
}

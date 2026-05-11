import { Request, Response } from 'express';
import { z } from 'zod';
import { TripStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { TripsService } from '../services/trips.service';

const svc = new TripsService(prisma);

const createTripSchema = z.object({
  originZone: z.string().min(2).max(100),
  destinationZone: z.string().min(2).max(100),
  departureTime: z.string().datetime({ offset: true }),
  totalSeats: z.number().int().min(1).max(8),
  pricePerSeat: z.number().positive(),
  notes: z.string().max(500).optional(),
  rules: z.string().max(500).optional(),
});

const updateTripSchema = createTripSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum([TripStatus.IN_PROGRESS, TripStatus.COMPLETED, TripStatus.CANCELLED]),
});

export async function createTrip(req: Request, res: Response) {
  const data = createTripSchema.parse(req.body);
  const trip = await svc.create(req.user!.id, {
    ...data,
    departureTime: new Date(data.departureTime),
  });
  res.status(201).json({ trip });
}

export async function getTrips(req: Request, res: Response) {
  const { destinationZone, departureDate, minSeats, status, driverId, page, limit } = req.query;
  const result = await svc.findMany({
    destinationZone: destinationZone as string,
    departureDate: departureDate as string,
    minSeats: minSeats ? Number(minSeats) : undefined,
    status: status as TripStatus,
    driverId: driverId as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  });
  res.json(result);
}

export async function getTrip(req: Request, res: Response) {
  const trip = await svc.findById(String(req.params.id));
  res.json({ trip });
}

export async function updateTrip(req: Request, res: Response) {
  const data = updateTripSchema.parse(req.body);
  const trip = await svc.update(String(req.params.id), req.user!.id, {
    ...data,
    departureTime: data.departureTime ? new Date(data.departureTime) : undefined,
  });
  res.json({ trip });
}

export async function cancelTrip(req: Request, res: Response) {
  const trip = await svc.cancel(String(req.params.id), req.user!.id);
  res.json({ trip });
}

export async function updateTripStatus(req: Request, res: Response) {
  const { status } = updateStatusSchema.parse(req.body);
  const trip = await svc.updateStatus(String(req.params.id), req.user!.id, status);
  res.json({ trip });
}

export async function safetyAck(req: Request, res: Response) {
  const result = await svc.safetyAck(String(req.params.id), req.user!.id);
  res.status(201).json(result);
}

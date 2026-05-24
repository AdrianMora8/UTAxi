import { Request, Response } from 'express';
import { z } from 'zod';
import { ReportStatus, UserStatus, TripEventType } from '@prisma/client';
import { prisma } from '../config/database';
import { AdminService } from '../services/admin.service';

const svc = new AdminService(prisma);

const reviewReportSchema = z.object({
  action: z.enum(['WARNED', 'SUSPENDED', 'DISMISSED']),
  notes: z.string().max(500).optional(),
});

const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export async function getReports(req: Request, res: Response) {
  const { status, page, limit } = req.query;
  const result = await svc.getReports({
    status: status as ReportStatus,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  });
  res.json(result);
}

export async function getReportById(req: Request, res: Response) {
  const report = await svc.getReportById(String(req.params.id));
  res.json({ report });
}

export async function reviewReport(req: Request, res: Response) {
  const { action, notes } = reviewReportSchema.parse(req.body);
  const result = await svc.reviewReport(String(req.params.id), req.user!.id, action, notes);
  res.json(result);
}

export async function getUsers(req: Request, res: Response) {
  const { status, search, page, limit } = req.query;
  const result = await svc.getUsers({
    status: status as UserStatus,
    search: search as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  });
  res.json(result);
}

export async function updateUserStatus(req: Request, res: Response) {
  const { status } = updateUserStatusSchema.parse(req.body);
  const user = await svc.updateUserStatus(String(req.params.id), status);
  res.json({ user });
}

export async function getStats(_req: Request, res: Response) {
  const stats = await svc.getStats();
  res.json(stats);
}

export async function getEvents(req: Request, res: Response) {
  const { tripId, type, page, limit } = req.query;
  const result = await svc.getEvents({
    tripId: tripId as string,
    type: type as TripEventType,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });
  res.json(result);
}

import { Request, Response } from 'express';
import { z } from 'zod';
import { ReportReason } from '@prisma/client';
import { prisma } from '../config/database';
import { ReportsService } from '../services/reports.service';

const svc = new ReportsService(prisma);

const createReportSchema = z.object({
  reportedId: z.string().min(1),
  reason: z.nativeEnum(ReportReason),
  description: z.string().min(10).max(1000),
});

export async function createReport(req: Request, res: Response) {
  const data = createReportSchema.parse(req.body);

  const files = (req.files as Express.Multer.File[]) ?? [];
  const evidenceUrls = files.map(f => `/uploads/${f.filename}`);

  const report = await svc.create(req.user!.id, { ...data, evidenceUrls });
  res.status(201).json({ report });
}

export async function getMyReports(req: Request, res: Response) {
  const reports = await svc.getMyReports(req.user!.id);
  res.json({ reports });
}

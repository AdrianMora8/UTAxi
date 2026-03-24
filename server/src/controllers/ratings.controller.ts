import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { RatingsService } from '../services/ratings.service';

const svc = new RatingsService(prisma);

const createRatingSchema = z.object({
  tripRequestId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(300).optional(),
});

export async function createRating(req: Request, res: Response) {
  const { tripRequestId, score, comment } = createRatingSchema.parse(req.body);
  const rating = await svc.create(req.user!.id, tripRequestId, score, comment);
  res.status(201).json({ rating });
}

export async function getUserRatings(req: Request, res: Response) {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 10;
  const result = await svc.getByUser(String(req.params.id), page, limit);
  res.json(result);
}

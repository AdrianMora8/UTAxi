import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { uploadEvidence } from '../middleware/upload.middleware';
import { createReport, getMyReports } from '../controllers/reports.controller';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.post('/', uploadEvidence, createReport);
reportsRouter.get('/my', getMyReports);

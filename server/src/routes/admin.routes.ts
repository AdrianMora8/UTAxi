import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import {
  getReports, getReportById, reviewReport,
  getUsers, updateUserStatus,
} from '../controllers/admin.controller';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/reports', getReports);
adminRouter.get('/reports/:id', getReportById);
adminRouter.patch('/reports/:id', reviewReport);

adminRouter.get('/users', getUsers);
adminRouter.patch('/users/:id/status', updateUserStatus);

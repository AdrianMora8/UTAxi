import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import {
  getReports, getReportById, reviewReport,
  getUsers, updateUserStatus, getUserDetail,
  getStats, getEvents,
  getAdminTrips, cancelAdminTrip,
  getVehicles, approveVehicle, rejectVehicle,
} from '../controllers/admin.controller';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/reports', getReports);
adminRouter.get('/reports/:id', getReportById);
adminRouter.patch('/reports/:id', reviewReport);

adminRouter.get('/users', getUsers);
adminRouter.patch('/users/:id/status', updateUserStatus);

adminRouter.get('/stats', getStats);
adminRouter.get('/events', getEvents);

adminRouter.get('/users/:id', getUserDetail);

adminRouter.get('/trips', getAdminTrips);
adminRouter.delete('/trips/:id', cancelAdminTrip);

adminRouter.get('/vehicles', getVehicles);
adminRouter.patch('/vehicles/:id/approve', approveVehicle);
adminRouter.patch('/vehicles/:id/reject', rejectVehicle);

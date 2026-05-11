import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { uploadVehiclePhoto as uploadMiddleware } from '../middleware/upload.middleware';
import {
  getMe,
  updateMe,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  uploadVehiclePhoto,
  getPublicProfile,
} from '../controllers/users.controller';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, getMe);
usersRouter.patch('/me', requireAuth, updateMe);
usersRouter.post('/me/vehicle', requireAuth, createVehicle);
usersRouter.patch('/me/vehicle', requireAuth, updateVehicle);
usersRouter.delete('/me/vehicle', requireAuth, deleteVehicle);
usersRouter.post('/me/vehicle/photo', requireAuth, uploadMiddleware, uploadVehiclePhoto);
usersRouter.get('/:id', requireAuth, getPublicProfile);
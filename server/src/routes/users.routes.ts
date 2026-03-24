import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getMe,
  updateMe,
  createVehicle,
  updateVehicle,
  getPublicProfile,
} from '../controllers/users.controller';

export const usersRouter = Router();

// Todas las rutas requieren autenticación excepto el perfil público
usersRouter.get('/me', requireAuth, getMe);
usersRouter.patch('/me', requireAuth, updateMe);
usersRouter.post('/me/vehicle', requireAuth, createVehicle);
usersRouter.patch('/me/vehicle', requireAuth, updateVehicle);
usersRouter.get('/:id', requireAuth, getPublicProfile);
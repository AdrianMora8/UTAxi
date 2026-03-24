import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createRequest,
  getRequestsByTrip,
  respondToRequest,
  cancelRequest,
  getMyRequests,
} from '../controllers/requests.controller';

export const requestsRouter = Router();

requestsRouter.use(requireAuth);

// Mis solicitudes como pasajero
requestsRouter.get('/my', getMyRequests);

// Por viaje
requestsRouter.post('/trip/:tripId', createRequest);
requestsRouter.get('/trip/:tripId', getRequestsByTrip);

// Por solicitud individual
requestsRouter.patch('/:id/respond', respondToRequest);
requestsRouter.delete('/:id', cancelRequest);

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createRequest,
  getRequestsByTrip,
  respondToRequest,
  cancelRequest,
  getMyRequests,
  markArrival,
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
requestsRouter.patch('/:id/arrival', markArrival);
requestsRouter.delete('/:id', cancelRequest);

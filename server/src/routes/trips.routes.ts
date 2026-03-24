import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createTrip,
  getTrips,
  getTrip,
  updateTrip,
  cancelTrip,
  updateTripStatus,
  safetyAck,
} from '../controllers/trips.controller';

export const tripsRouter = Router();

tripsRouter.use(requireAuth);

tripsRouter.post('/', createTrip);
tripsRouter.get('/', getTrips);
tripsRouter.get('/:id', getTrip);
tripsRouter.patch('/:id', updateTrip);
tripsRouter.delete('/:id', cancelTrip);
tripsRouter.patch('/:id/status', updateTripStatus);
tripsRouter.post('/:id/safety-ack', safetyAck);

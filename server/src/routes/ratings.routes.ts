import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createRating, getUserRatings } from '../controllers/ratings.controller';

export const ratingsRouter = Router();

ratingsRouter.use(requireAuth);

ratingsRouter.post('/', createRating);
ratingsRouter.get('/user/:id', getUserRatings);

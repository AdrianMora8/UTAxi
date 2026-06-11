import { PrismaClient, TripStatus, RequestStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export class RatingsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(raterId: string, tripRequestId: string, score: number, comment?: string) {
    const tripRequest = await this.prisma.tripRequest.findUnique({
      where: { id: tripRequestId },
      include: { trip: true },
    });

    if (!tripRequest) throw new AppError(404, 'Solicitud de viaje no encontrada');
    if (tripRequest.trip.status !== TripStatus.COMPLETED) {
      throw new AppError(400, 'Solo se puede calificar cuando el viaje está COMPLETED');
    }
    if (tripRequest.status !== RequestStatus.ACCEPTED && tripRequest.status !== RequestStatus.COMPLETED) {
      throw new AppError(400, 'Solo pasajeros del viaje pueden calificar');
    }

    const isDriver = tripRequest.trip.driverId === raterId;
    const isPassenger = tripRequest.passengerId === raterId;

    if (!isDriver && !isPassenger) {
      throw new AppError(403, 'No participaste en este viaje');
    }

    const ratedId = isDriver ? tripRequest.passengerId : tripRequest.trip.driverId;
    const raterRole = isDriver ? 'DRIVER' : 'PASSENGER';

    const existing = await this.prisma.rating.findFirst({
      where: { tripRequestId, raterId },
    });
    if (existing) throw new AppError(409, 'Ya calificaste este viaje');

    const rating = await this.prisma.rating.create({
      data: { tripRequestId, raterId, ratedId, score, comment, raterRole },
    });

    // Recalcular reputationScore del usuario calificado
    const agg = await this.prisma.rating.aggregate({
      where: { ratedId },
      _avg: { score: true },
      _count: { score: true },
    });

    await this.prisma.user.update({
      where: { id: ratedId },
      data: { reputationScore: agg._avg.score ?? 5.0 },
    });

    return rating;
  }

  async getByUser(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [ratings, total] = await this.prisma.$transaction([
      this.prisma.rating.findMany({
        where: { ratedId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rater: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.rating.count({ where: { ratedId: userId } }),
    ]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { reputationScore: true, totalTrips: true },
    });

    return {
      ratings,
      total,
      page,
      limit,
      reputationScore: user?.reputationScore ?? 5.0,
      totalRatings: total,
    };
  }
}

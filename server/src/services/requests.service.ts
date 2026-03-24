import { PrismaClient, RequestStatus, TripStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export class RequestsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tripId: string, passengerId: string, message?: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError(404, 'Viaje no encontrado');
    if (trip.driverId === passengerId) throw new AppError(403, 'El conductor no puede unirse a su propio viaje');
    if (trip.status !== TripStatus.SCHEDULED) throw new AppError(400, 'Solo se puede solicitar unirse a viajes en estado SCHEDULED');
    if (trip.availableSeats < 1) throw new AppError(400, 'No hay cupos disponibles en este viaje');

    const existing = await this.prisma.tripRequest.findUnique({
      where: { tripId_passengerId: { tripId, passengerId } },
    });
    if (existing) throw new AppError(400, 'Ya enviaste una solicitud para este viaje');

    const request = await this.prisma.tripRequest.create({
      data: { tripId, passengerId, message },
      include: {
        passenger: { select: { id: true, fullName: true, career: true, reputationScore: true } },
        trip: { select: { id: true, originZone: true, destinationZone: true, departureTime: true } },
      },
    });
    return request;
  }

  async getByTrip(tripId: string, driverId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError(404, 'Viaje no encontrado');
    if (trip.driverId !== driverId) throw new AppError(403, 'Solo el conductor puede ver las solicitudes de su viaje');

    const requests = await this.prisma.tripRequest.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
      include: {
        passenger: {
          select: {
            id: true,
            fullName: true,
            career: true,
            neighborhood: true,
            reputationScore: true,
            totalTrips: true,
          },
        },
      },
    });
    return requests;
  }

  async respond(requestId: string, driverId: string, action: 'ACCEPT' | 'REJECT') {
    const request = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      include: { trip: true },
    });
    if (!request) throw new AppError(404, 'Solicitud no encontrada');
    if (request.trip.driverId !== driverId) throw new AppError(403, 'Solo el conductor puede gestionar solicitudes');
    if (request.status !== RequestStatus.PENDING) throw new AppError(400, `La solicitud ya fue ${request.status === RequestStatus.ACCEPTED ? 'aceptada' : 'rechazada'}`);

    if (action === 'ACCEPT') {
      if (request.trip.availableSeats < 1) throw new AppError(400, 'No hay cupos disponibles');

      const [updated] = await this.prisma.$transaction([
        this.prisma.tripRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.ACCEPTED },
          include: {
            passenger: { select: { id: true, fullName: true } },
            trip: { select: { id: true, destinationZone: true, departureTime: true, availableSeats: true } },
          },
        }),
        this.prisma.trip.update({
          where: { id: request.tripId },
          data: { availableSeats: { decrement: 1 } },
        }),
      ]);
      return updated;
    }

    return this.prisma.tripRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.REJECTED },
      include: {
        passenger: { select: { id: true, fullName: true } },
      },
    });
  }

  async cancelRequest(requestId: string, passengerId: string) {
    const request = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      include: { trip: true },
    });
    if (!request) throw new AppError(404, 'Solicitud no encontrada');
    if (request.passengerId !== passengerId) throw new AppError(403, 'No puedes cancelar una solicitud que no es tuya');
    if (request.status === RequestStatus.ACCEPTED) {
      // Devolver el cupo al viaje
      await this.prisma.$transaction([
        this.prisma.tripRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.CANCELLED },
        }),
        this.prisma.trip.update({
          where: { id: request.tripId },
          data: { availableSeats: { increment: 1 } },
        }),
      ]);
      return { message: 'Solicitud cancelada y cupo devuelto al viaje' };
    }

    await this.prisma.tripRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.CANCELLED },
    });
    return { message: 'Solicitud cancelada' };
  }

  async getMyRequests(passengerId: string) {
    const requests = await this.prisma.tripRequest.findMany({
      where: { passengerId },
      orderBy: { createdAt: 'desc' },
      include: {
        trip: {
          include: {
            driver: { select: { id: true, fullName: true, reputationScore: true } },
          },
        },
      },
    });
    return requests;
  }
}

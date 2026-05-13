import { PrismaClient, RequestStatus, TripStatus, PaymentStatus, TransactionType, TransactionConcept } from '@prisma/client';
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

    if (existing) {
      if (existing.status === 'REJECTED') {
        if (existing.rejectionCount >= 3) {
          throw new AppError(400, 'Has alcanzado el límite de 3 rechazos para este viaje. Ya no puedes solicitar unirte.');
        }
        // Allow re-request: reset to PENDING (conflict checks below still apply)
        const updated = await this.prisma.tripRequest.update({
          where: { id: existing.id },
          data: { status: 'PENDING', message: message ?? existing.message },
          include: {
            passenger: { select: { id: true, fullName: true, career: true, reputationScore: true } },
            trip: { select: { id: true, originZone: true, destinationZone: true, departureTime: true } },
          },
        });
        return updated;
      }
      throw new AppError(400, 'Ya enviaste una solicitud para este viaje');
    }

    const bufferHours = 2;
    const bufferStart = new Date(trip.departureTime);
    bufferStart.setHours(bufferStart.getHours() - bufferHours);
    
    const bufferEnd = new Date(trip.departureTime);
    bufferEnd.setHours(bufferEnd.getHours() + bufferHours);

    // Check if user is driving another trip
    const conflictingDriverTrip = await this.prisma.trip.findFirst({
      where: {
        driverId: passengerId,
        status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
        departureTime: {
          gte: bufferStart,
          lte: bufferEnd
        }
      }
    });

    if (conflictingDriverTrip) {
      throw new AppError(400, 'Ya tienes un viaje programado como conductor en ese horario (±2 horas). No puedes pedir este viaje.');
    }

    // Check if user is already a passenger in another overlapping trip
    const conflictingPassengerTrip = await this.prisma.tripRequest.findFirst({
      where: {
        passengerId,
        status: { in: ['ACCEPTED', 'PENDING'] },
        trip: {
          status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
          departureTime: {
            gte: bufferStart,
            lte: bufferEnd
          }
        }
      }
    });

    if (conflictingPassengerTrip) {
      throw new AppError(400, 'Ya estás anotado o tienes solicitud pendiente en otro viaje para ese horario (±2 horas).');
    }

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
        ratings: { select: { id: true, score: true, raterId: true } },
      },
    });

    // Exponer solo el rating que hizo el conductor (para saber si ya calificó al pasajero)
    return requests.map(r => ({
      ...r,
      rating: r.ratings.find(rt => rt.raterId === driverId) ?? null,
    }));
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
      data: {
        status: RequestStatus.REJECTED,
        rejectionCount: { increment: 1 },
      },
      include: {
        passenger: { select: { id: true, fullName: true } },
      },
    });
  }

  async cancelRequest(requestId: string, passengerId: string) {
    const request = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      include: { trip: true, payment: true },
    });

    if (!request) throw new AppError(404, 'Solicitud no encontrada');
    if (request.passengerId !== passengerId) throw new AppError(403, 'No puedes cancelar una solicitud que no es tuya');
    if (request.status === RequestStatus.CANCELLED) throw new AppError(400, 'La solicitud ya fue cancelada');
    if (request.trip.status === TripStatus.IN_PROGRESS) throw new AppError(400, 'No puedes cancelar mientras el viaje está en curso');
    if (request.trip.status === TripStatus.COMPLETED) throw new AppError(400, 'El viaje ya fue completado');

    // PENDING: cancelación simple sin cupo ni pago involucrado
    if (request.status === RequestStatus.PENDING) {
      await this.prisma.tripRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.CANCELLED },
      });
      return { refunded: false, message: 'Solicitud cancelada' };
    }

    // ACCEPTED sin pago: devolver cupo y listo
    if (!request.payment || request.payment.status !== PaymentStatus.CONFIRMED) {
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
      return { refunded: false, message: 'Reserva cancelada y cupo devuelto al viaje' };
    }

    // ACCEPTED con pago confirmado: aplicar política de cancelación
    const minutesUntilDeparture = (new Date(request.trip.departureTime).getTime() - Date.now()) / 60_000;
    const amount = request.payment.amount;
    const driverId = request.trip.driverId;

    // Regla 1: ventana de gracia de 30 min si el conductor cambió la hora recientemente
    const withinGracePeriod = !!request.trip.departureTimeChangedAt &&
      (Date.now() - new Date(request.trip.departureTimeChangedAt).getTime()) < 30 * 60_000;

    if (minutesUntilDeparture >= 10 || withinGracePeriod) {
      // Dentro del plazo: reembolso total al wallet del pasajero
      await this.prisma.$transaction([
        this.prisma.tripRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.CANCELLED },
        }),
        this.prisma.trip.update({
          where: { id: request.tripId },
          data: { availableSeats: { increment: 1 } },
        }),
        this.prisma.payment.update({
          where: { id: request.payment.id },
          data: { status: PaymentStatus.REFUNDED },
        }),
        this.prisma.user.update({
          where: { id: passengerId },
          data: { walletBalance: { increment: amount } },
        }),
        this.prisma.user.update({
          where: { id: driverId },
          data: { pendingBalance: { decrement: amount } },
        }),
        this.prisma.walletTransaction.create({
          data: {
            userId: passengerId,
            amount,
            type: TransactionType.CREDIT,
            concept: TransactionConcept.REFUND,
            description: `${request.trip.originZone} → ${request.trip.destinationZone}`,
            relatedRequestId: requestId,
          },
        }),
      ]);
      return {
        refunded: true,
        amount: Number(amount),
        message: withinGracePeriod
          ? `Cancelación por cambio de horario. Se reembolsaron $${Number(amount).toFixed(2)} a tu U-Wallet`
          : `Se reembolsaron $${Number(amount).toFixed(2)} a tu U-Wallet`,
      };
    }

    // Fuera del plazo: el conductor se queda con el dinero como compensación
    await this.prisma.$transaction([
      this.prisma.tripRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.CANCELLED },
      }),
      this.prisma.trip.update({
        where: { id: request.tripId },
        data: { availableSeats: { increment: 1 } },
      }),
      this.prisma.user.update({
        where: { id: driverId },
        data: {
          pendingBalance: { decrement: amount },
          walletBalance: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          userId: driverId,
          amount,
          type: TransactionType.CREDIT,
          concept: TransactionConcept.CANCELLATION_FEE,
          description: `${request.trip.originZone} → ${request.trip.destinationZone}`,
          relatedRequestId: requestId,
        },
      }),
    ]);
    return {
      refunded: false,
      message: 'Cancelación fuera del plazo permitido. No se realizó reembolso.',
    };
  }

  async markArrival(requestId: string, driverId: string, arrived: boolean) {
    const request = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      include: { trip: true },
    });
    if (!request) throw new AppError(404, 'Solicitud no encontrada');
    if (request.trip.driverId !== driverId) throw new AppError(403, 'Solo el conductor puede registrar llegadas');
    if (request.status !== 'ACCEPTED') throw new AppError(400, 'Solo se puede registrar llegada de pasajeros aceptados');

    const updated = await this.prisma.tripRequest.update({
      where: { id: requestId },
      data: { arrivedAt: arrived ? new Date() : null },
    });
    return updated;
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
        ratings: { select: { id: true, score: true, comment: true, raterId: true } },
        payment: { select: { id: true, amount: true, status: true, confirmedAt: true } },
      },
    });

    return requests.map(r => ({
      ...r,
      // Exponer solo el rating que hizo el propio pasajero (para saber si ya calificó al conductor)
      rating: r.ratings.find(rt => rt.raterId === passengerId) ?? null,
      payment: r.payment ? { ...r.payment, amount: Number(r.payment.amount) } : null,
    }));
  }
}

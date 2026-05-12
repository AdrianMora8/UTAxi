import { PrismaClient, TripStatus, PaymentStatus, TransactionType, TransactionConcept, RequestStatus, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { emitToUser } from '../socket/tracking.gateway';

export class TripsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(driverId: string, data: {
    originZone: string;
    originLat?: number;
    originLng?: number;
    destinationZone: string;
    destLat?: number;
    destLng?: number;
    departureTime: Date;
    totalSeats: number;
    pricePerSeat: number;
    notes?: string;
    rules?: string;
  }) {
    const bufferHours = 2;
    const bufferStart = new Date(data.departureTime);
    bufferStart.setHours(bufferStart.getHours() - bufferHours);
    
    const bufferEnd = new Date(data.departureTime);
    bufferEnd.setHours(bufferEnd.getHours() + bufferHours);

    // Check if user is driving another trip at that time
    const conflictingDriverTrip = await this.prisma.trip.findFirst({
      where: {
        driverId,
        status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
        departureTime: {
          gte: bufferStart,
          lte: bufferEnd
        }
      }
    });
    
    if (conflictingDriverTrip) {
      throw new AppError(400, 'Ya tienes un viaje programado como conductor en ese horario (±2 horas). No puedes crear viajes simultáneos.');
    }

    // Check if user is a passenger in another trip at that time
    const conflictingPassengerTrip = await this.prisma.tripRequest.findFirst({
      where: {
        passengerId: driverId,
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
      throw new AppError(400, 'Ya tienes una solicitud de pasajero en otro viaje para ese horario (±2 horas). No puedes ser conductor simultáneamente.');
    }

    const trip = await this.prisma.trip.create({
      data: {
        driverId,
        ...data,
        availableSeats: data.totalSeats,
      },
      include: { driver: { select: { id: true, fullName: true, reputationScore: true } } },
    });
    return trip;
  }

  async findMany(filters: {
    destinationZone?: string;
    departureDate?: string;
    minSeats?: number;
    status?: TripStatus;
    driverId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 10, 50);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.destinationZone) {
      where.destinationZone = { contains: filters.destinationZone, mode: 'insensitive' };
    }
    if (filters.departureDate) {
      const date = new Date(filters.departureDate);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      where.departureTime = { gte: date, lt: next };
    }
    if (filters.minSeats) {
      where.availableSeats = { gte: Number(filters.minSeats) };
    }
    if (filters.driverId) {
      where.driverId = filters.driverId;
    }

    if (filters.status) {
      where.status = filters.status;
    } else if (!filters.driverId) {
      where.status = TripStatus.SCHEDULED;
    }

    const [trips, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { departureTime: 'asc' },
        include: {
          driver: {
            select: {
              id: true,
              fullName: true,
              reputationScore: true,
              vehicle: { select: { brand: true, model: true, color: true } },
            },
          },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return { trips, total, page, limit };
  }

  async findById(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            career: true,
            reputationScore: true,
            totalTrips: true,
            vehicle: { select: { brand: true, model: true, year: true, color: true, plateNumber: true } },
          },
        },
        _count: { select: { requests: { where: { status: 'ACCEPTED' } } } },
      },
    });

    if (!trip) throw new AppError(404, 'Viaje no encontrado');
    return trip;
  }

  async update(tripId: string, driverId: string, data: {
    originZone?: string;
    originLat?: number;
    originLng?: number;
    destinationZone?: string;
    destLat?: number;
    destLng?: number;
    departureTime?: Date;
    totalSeats?: number;
    pricePerSeat?: number;
    notes?: string;
    rules?: string;
  }) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError(404, 'Viaje no encontrado');
    if (trip.driverId !== driverId) throw new AppError(403, 'No tienes permiso para editar este viaje');
    if (trip.status !== TripStatus.SCHEDULED) throw new AppError(400, 'Solo se pueden editar viajes en estado SCHEDULED');

    return this.prisma.trip.update({
      where: { id: tripId },
      data,
    });
  }

  async cancel(tripId: string, driverId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError(404, 'Viaje no encontrado');
    if (trip.driverId !== driverId) throw new AppError(403, 'No tienes permiso para cancelar este viaje');
    if (trip.status === TripStatus.COMPLETED) throw new AppError(400, 'No se puede cancelar un viaje completado');

    return this.prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.CANCELLED },
    });
  }

  async updateStatus(tripId: string, driverId: string, status: TripStatus) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: { select: { fullName: true } } },
    });
    if (!trip) throw new AppError(404, 'Viaje no encontrado');
    if (trip.driverId !== driverId) throw new AppError(403, 'No tienes permiso para modificar este viaje');

    const allowed: Record<TripStatus, TripStatus[]> = {
      SCHEDULED:   [TripStatus.CANCELLED],
      IN_PROGRESS: [TripStatus.COMPLETED],
      COMPLETED:   [],
      CANCELLED:   [],
    };
    if (!allowed[trip.status].includes(status)) {
      if (status === TripStatus.IN_PROGRESS && trip.status === TripStatus.SCHEDULED) {
        throw new AppError(400, 'Para iniciar el viaje usa POST /trips/:id/start con la lista de asistencia');
      }
      throw new AppError(400, `No se puede pasar de ${trip.status} a ${status}`);
    }

    if (status !== TripStatus.COMPLETED) {
      return this.prisma.trip.update({ where: { id: tripId }, data: { status } });
    }

    // Al completar: flush de escrow → walletBalance del conductor
    const acceptedRequests = await this.prisma.tripRequest.findMany({
      where: { tripId, status: 'ACCEPTED' },
      include: {
        payment: true,
        passenger: { select: { id: true, fullName: true } },
      },
    });

    const paidRequests = acceptedRequests.filter(r => r.payment?.status === PaymentStatus.CONFIRMED);

    const totalEarned = paidRequests.reduce(
      (sum, r) => sum + Number(r.payment!.amount),
      0,
    );

    await this.prisma.$transaction([
      this.prisma.trip.update({ where: { id: tripId }, data: { status } }),
      // Marcar todas las solicitudes aceptadas como COMPLETED
      this.prisma.tripRequest.updateMany({
        where: { tripId, status: RequestStatus.ACCEPTED },
        data: { status: RequestStatus.COMPLETED },
      }),
      this.prisma.user.update({
        where: { id: driverId },
        data: {
          pendingBalance: { decrement: totalEarned },
          walletBalance: { increment: totalEarned },
          totalTrips: { increment: 1 },
        },
      }),
      ...paidRequests.map(r =>
        this.prisma.walletTransaction.create({
          data: {
            userId: driverId,
            amount: r.payment!.amount,
            type: TransactionType.CREDIT,
            concept: TransactionConcept.TRIP_EARNING,
            description: `${trip.originZone} → ${trip.destinationZone}`,
            relatedRequestId: r.id,
          },
        }),
      ),
    ]);

    const completedTrip = await this.prisma.trip.findUnique({ where: { id: tripId } });

    // Notificar a cada pasajero para que califiquen al conductor
    for (const req of acceptedRequests) {
      emitToUser(req.passenger.id, 'trip:completed', {
        tripId,
        requestId: req.id,
        driverName: trip.driver.fullName,
        originZone: trip.originZone,
        destinationZone: trip.destinationZone,
      });
    }

    // Notificar al conductor con la lista de pasajeros a calificar
    emitToUser(driverId, 'trip:completed', {
      tripId,
      passengers: acceptedRequests.map(r => ({
        requestId: r.id,
        name: r.passenger.fullName,
      })),
    });

    return completedTrip;
  }

  async startTrip(tripId: string, driverId: string, boardedRequestIds: string[]) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: { select: { fullName: true } } },
    });
    if (!trip) throw new AppError(404, 'Viaje no encontrado');
    if (trip.driverId !== driverId) throw new AppError(403, 'No tienes permiso para iniciar este viaje');
    if (trip.status !== TripStatus.SCHEDULED) throw new AppError(400, 'Solo se pueden iniciar viajes en estado SCHEDULED');

    const acceptedRequests = await this.prisma.tripRequest.findMany({
      where: { tripId, status: RequestStatus.ACCEPTED },
      include: {
        payment: true,
        passenger: { select: { id: true, fullName: true } },
      },
    });

    if (acceptedRequests.length === 0) throw new AppError(400, 'No hay pasajeros aceptados en este viaje');

    const boardedSet = new Set(boardedRequestIds);
    const boarded  = acceptedRequests.filter(r =>  boardedSet.has(r.id));
    const noShows  = acceptedRequests.filter(r => !boardedSet.has(r.id));

    const noShowsPaid   = noShows.filter(r => r.payment?.status === PaymentStatus.CONFIRMED);
    const noShowsUnpaid = noShows.filter(r => !r.payment || r.payment.status !== PaymentStatus.CONFIRMED);

    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.trip.update({ where: { id: tripId }, data: { status: TripStatus.IN_PROGRESS } }),
      ...boarded.map(r =>
        this.prisma.tripRequest.update({ where: { id: r.id }, data: { arrivedAt: new Date() } }),
      ),
      ...noShowsUnpaid.map(r =>
        this.prisma.tripRequest.update({ where: { id: r.id }, data: { status: RequestStatus.CANCELLED } }),
      ),
    ];

    // No-show con pago: conductor se queda el dinero (equivalente a cancelación <10 min)
    for (const r of noShowsPaid) {
      const amount = r.payment!.amount;
      ops.push(
        this.prisma.tripRequest.update({ where: { id: r.id }, data: { status: RequestStatus.CANCELLED } }),
        this.prisma.user.update({
          where: { id: driverId },
          data: { pendingBalance: { decrement: amount }, walletBalance: { increment: amount } },
        }),
        this.prisma.walletTransaction.create({
          data: {
            userId: driverId,
            amount,
            type: TransactionType.CREDIT,
            concept: TransactionConcept.CANCELLATION_FEE,
            description: `No-show: ${trip.originZone} → ${trip.destinationZone}`,
            relatedRequestId: r.id,
          },
        }),
      );
    }

    await this.prisma.$transaction(ops);

    for (const r of noShows) {
      emitToUser(r.passenger.id, 'request:cancelled-no-show', {
        tripId,
        requestId: r.id,
        driverName: trip.driver.fullName,
        originZone: trip.originZone,
        destinationZone: trip.destinationZone,
        refunded: false,
      });
    }

    return this.prisma.trip.findUnique({ where: { id: tripId } });
  }

  async safetyAck(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError(404, 'Viaje no encontrado');

    await this.prisma.safetyAcknowledgment.upsert({
      where: { userId_tripId: { userId, tripId } },
      create: { userId, tripId },
      update: {},
    });

    return { acknowledged: true };
  }
}

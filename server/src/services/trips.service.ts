import { PrismaClient, TripStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export class TripsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(driverId: string, data: {
    originZone: string;
    destinationZone: string;
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
    destinationZone?: string;
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
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError(404, 'Viaje no encontrado');
    if (trip.driverId !== driverId) throw new AppError(403, 'No tienes permiso para modificar este viaje');

    const allowed: Record<TripStatus, TripStatus[]> = {
      SCHEDULED:   [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
      IN_PROGRESS: [TripStatus.COMPLETED],
      COMPLETED:   [],
      CANCELLED:   [],
    };
    if (!allowed[trip.status].includes(status)) {
      throw new AppError(400, `No se puede pasar de ${trip.status} a ${status}`);
    }

    return this.prisma.trip.update({ where: { id: tripId }, data: { status } });
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

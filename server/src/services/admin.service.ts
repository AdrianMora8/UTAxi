import { PrismaClient, ReportStatus, UserStatus, TripEventType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Reportes ─────────────────────────────────────────────────────────────

  async getReports(filters: { status?: ReportStatus; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 10, 50);
    const skip = (page - 1) * limit;
    const where = filters.status ? { status: filters.status } : {};

    const [reports, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, fullName: true, email: true } },
          reported: { select: { id: true, fullName: true, email: true, status: true } },
          reviews: { select: { action: true, notes: true, createdAt: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, total, page, limit };
  }

  async getReportById(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: { select: { id: true, fullName: true, email: true } },
        reported: { select: { id: true, fullName: true, email: true, status: true } },
        reviews: {
          include: { admin: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!report) throw new AppError(404, 'Reporte no encontrado');
    return report;
  }

  async reviewReport(reportId: string, adminId: string, action: 'WARNED' | 'SUSPENDED' | 'DISMISSED', notes?: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new AppError(404, 'Reporte no encontrado');
    if (report.status === ReportStatus.RESOLVED) throw new AppError(400, 'Este reporte ya fue resuelto');

    let newUserStatus: UserStatus | undefined;
    if (action === 'WARNED') newUserStatus = UserStatus.WARNED;
    if (action === 'SUSPENDED') newUserStatus = UserStatus.SUSPENDED;

    const [updatedReport] = await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: { status: ReportStatus.RESOLVED },
      }),
      this.prisma.reportReview.create({
        data: { reportId, adminId, action, notes },
      }),
      ...(newUserStatus
        ? [this.prisma.user.update({
            where: { id: report.reportedId },
            data: { status: newUserStatus },
          })]
        : []),
    ]);

    const affectedUser = await this.prisma.user.findUnique({
      where: { id: report.reportedId },
      select: { id: true, fullName: true, email: true, status: true },
    });

    return { report: updatedReport, affectedUser };
  }

  // ─── Usuarios ─────────────────────────────────────────────────────────────

  async getUsers(filters: { status?: UserStatus; search?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 10, 50);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, fullName: true, career: true,
          role: true, status: true, reputationScore: true,
          totalTrips: true, emailVerified: true, createdAt: true,
          _count: { select: { reportsFiled: true, reportsReceived: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async updateUserStatus(userId: string, status: UserStatus, suspendedUntil?: Date) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'Usuario no encontrado');

    const data: any = { status };
    if (status === 'SUSPENDED' && suspendedUntil) {
      data.suspendedUntil = suspendedUntil;
    } else if (status !== 'SUSPENDED') {
      data.suspendedUntil = null;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, fullName: true, email: true, status: true, suspendedUntil: true },
    });
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, fullName: true, career: true, phone: true,
        neighborhood: true, role: true, status: true, suspendedUntil: true,
        reputationScore: true, totalTrips: true, emailVerified: true, createdAt: true,
        vehicle: { select: { brand: true, model: true, year: true, plateNumber: true, color: true } },
        tripsAsDriver: {
          orderBy: { createdAt: 'desc' }, take: 5,
          select: { id: true, originZone: true, destinationZone: true, departureTime: true, status: true },
        },
        ratingsReceived: {
          orderBy: { createdAt: 'desc' }, take: 5,
          select: { score: true, comment: true, raterRole: true, createdAt: true },
        },
        reportsReceived: {
          orderBy: { createdAt: 'desc' }, take: 5,
          select: {
            id: true, reason: true, description: true, status: true, createdAt: true,
            reporter: { select: { fullName: true } },
          },
        },
        _count: { select: { reportsFiled: true, reportsReceived: true, tripsAsDriver: true, tripRequests: true } },
      },
    });
    if (!user) throw new AppError(404, 'Usuario no encontrado');
    return user;
  }

  // ─── Trips ──────────────────────────────────────────────────────────────────

  async getTrips(filters: { status?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 15, 50);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.status) where.status = filters.status;

    const [trips, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          driver: { select: { id: true, fullName: true, email: true, status: true } },
          _count: { select: { requests: true } },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return { trips, total, page, limit };
  }

  async cancelTrip(tripId: string, adminId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        requests: {
          where: { status: { in: ['ACCEPTED', 'PENDING'] } },
          include: { payment: true, passenger: { select: { id: true } } },
        },
      },
    });
    if (!trip) throw new AppError(404, 'Viaje no encontrado');
    if (trip.status === 'CANCELLED') throw new AppError(400, 'El viaje ya está cancelado');
    if (trip.status === 'COMPLETED') throw new AppError(400, 'No se puede cancelar un viaje completado');

    const ops: any[] = [
      this.prisma.trip.update({ where: { id: tripId }, data: { status: 'CANCELLED' } }),
      this.prisma.tripRequest.updateMany({
        where: { tripId, status: { in: ['ACCEPTED', 'PENDING'] } },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.tripEvent.create({
        data: { tripId, type: 'TRIP_CANCELLED', actorId: adminId, metadata: { reason: 'admin_action' } as any },
      }),
    ];

    const paidRequests = trip.requests.filter((r: any) => r.payment?.status === 'CONFIRMED');
    for (const r of paidRequests) {
      const amount = r.payment!.amount;
      ops.push(
        this.prisma.payment.update({ where: { id: r.payment!.id }, data: { status: 'REFUNDED' } }),
        this.prisma.user.update({ where: { id: r.passenger.id }, data: { walletBalance: { increment: amount } } }),
        this.prisma.user.update({ where: { id: trip.driverId }, data: { pendingBalance: { decrement: amount } } }),
        this.prisma.walletTransaction.create({
          data: {
            userId: r.passenger.id, amount, type: 'CREDIT', concept: 'REFUND',
            description: `Viaje cancelado por administrador: ${trip.originZone} → ${trip.destinationZone}`,
            relatedRequestId: r.id,
          },
        }),
      );
    }

    await this.prisma.$transaction(ops);
    return { cancelled: true, refundedPassengers: paidRequests.length };
  }

  // ─── Estadísticas ──────────────────────────────────────────────────────────

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalTrips,
      completedTrips,
      cancelledTrips,
      activeTrips,
      openReports,
      totalReports,
      revenueResult,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.trip.count(),
      this.prisma.trip.count({ where: { status: 'COMPLETED' } }),
      this.prisma.trip.count({ where: { status: 'CANCELLED' } }),
      this.prisma.trip.count({ where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } }),
      this.prisma.report.count({ where: { status: 'OPEN' } }),
      this.prisma.report.count(),
      this.prisma.walletTransaction.aggregate({
        where: { concept: 'TOPUP' },
        _sum: { amount: true },
      }),
    ]);

    const avgReputation = await this.prisma.user.aggregate({
      _avg: { reputationScore: true },
      where: { role: 'STUDENT' },
    });

    return {
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      trips: { total: totalTrips, completed: completedTrips, cancelled: cancelledTrips, active: activeTrips },
      reports: { open: openReports, total: totalReports },
      revenue: Number(revenueResult._sum.amount ?? 0),
      avgReputation: Number(avgReputation._avg.reputationScore?.toFixed(2) ?? 5),
    };
  }

  // ─── Eventos ───────────────────────────────────────────────────────────────

  async getEvents(filters: {
    tripId?: string;
    type?: TripEventType;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.tripId) where.tripId = filters.tripId;
    if (filters.type) where.type = filters.type;

    const [events, total] = await this.prisma.$transaction([
      this.prisma.tripEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, fullName: true, email: true } },
          trip: { select: { id: true, originZone: true, destinationZone: true } },
        },
      }),
      this.prisma.tripEvent.count({ where }),
    ]);

    return { events, total, page, limit };
  }
}

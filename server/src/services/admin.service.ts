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

  async updateUserStatus(userId: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'Usuario no encontrado');

    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, fullName: true, email: true, status: true },
    });
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

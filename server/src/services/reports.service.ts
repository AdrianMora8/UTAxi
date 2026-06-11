import { PrismaClient, ReportReason } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export class ReportsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(reporterId: string, data: {
    reportedId: string;
    reason: ReportReason;
    description: string;
    evidenceUrls?: string[];
  }) {
    if (data.reportedId === reporterId) {
      throw new AppError(400, 'No puedes reportarte a ti mismo');
    }

    const reported = await this.prisma.user.findUnique({ where: { id: data.reportedId } });
    if (!reported) throw new AppError(404, 'Usuario reportado no encontrado');

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedId: data.reportedId,
        reason: data.reason,
        description: data.description,
        evidenceUrls: data.evidenceUrls ?? [],
      },
      include: {
        reported: { select: { id: true, fullName: true, email: true } },
      },
    });

    return report;
  }

  getMyReports(reporterId: string) {
    return this.prisma.report.findMany({
      where: { reporterId },
      orderBy: { createdAt: 'desc' },
      include: {
        reported: { select: { id: true, fullName: true } },
        reviews: { select: { action: true, createdAt: true } },
      },
    });
  }
}

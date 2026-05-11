import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        career: true,
        phone: true,
        photoUrl: true,
        neighborhood: true,
        role: true,
        status: true,
        reputationScore: true,
        totalTrips: true,
        walletBalance: true,
        pendingBalance: true,
        emailVerified: true,
        createdAt: true,
        vehicle: {
          select: {
            id: true,
            brand: true,
            model: true,
            year: true,
            plateNumber: true,
            color: true,
            photoUrl: true,
          },
        },
      },
    });

    if (!user) throw new AppError(404, 'Usuario no encontrado');
    return user;
  }

  async updateMe(userId: string, data: {
    fullName?: string;
    career?: string;
    phone?: string;
    neighborhood?: string;
  }) {
    // Validación de seguridad: asegurar que el usuario existe
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        career: true,
        phone: true,
        neighborhood: true,
        role: true,
        reputationScore: true,
        totalTrips: true,
      },
    });
    return user;
  }

  async createVehicle(userId: string, data: {
    brand: string;
    model: string;
    year: number;
    plateNumber: string;
    color: string;
  }) {
    const existing = await this.prisma.vehicle.findUnique({ where: { userId } });
    if (existing) throw new AppError(409, 'Ya tienes un vehículo registrado. Usa PATCH para actualizarlo.');

    const vehicle = await this.prisma.vehicle.create({
      data: { userId, ...data },
    });
    return vehicle;
  }

  async updateVehicle(userId: string, data: {
    brand?: string;
    model?: string;
    year?: number;
    plateNumber?: string;
    color?: string;
  }) {
    const existing = await this.prisma.vehicle.findUnique({ where: { userId } });
    if (!existing) throw new AppError(404, 'No tienes vehículo registrado. Usa POST para crear uno.');

    // Validar que el vehículo pertenece al usuario (capa de seguridad extra)
    if (existing.userId !== userId) {
      throw new AppError(403, 'No puedes editar el vehículo de otro usuario');
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { userId },
      data,
    });
    return vehicle;
  }

  async updateVehiclePhoto(userId: string, photoUrl: string) {
    const existing = await this.prisma.vehicle.findUnique({ where: { userId } });
    if (!existing) throw new AppError(404, 'No tienes vehículo registrado');

    const vehicle = await this.prisma.vehicle.update({
      where: { userId },
      data: { photoUrl },
    });
    return vehicle;
  }

  async deleteVehicle(userId: string) {
    const existing = await this.prisma.vehicle.findUnique({ where: { userId } });
    if (!existing) throw new AppError(404, 'No tienes vehículo registrado');

    await this.prisma.vehicle.delete({ where: { userId } });
  }

  async getPublicProfile(targetId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        fullName: true,
        career: true,
        reputationScore: true,
        totalTrips: true,
        createdAt: true,
        vehicle: {
          select: {
            brand: true,
            model: true,
            year: true,
            color: true,
          },
        },
        ratingsReceived: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            score: true,
            comment: true,
            raterRole: true,
            createdAt: true,
            rater: { select: { fullName: true } },
          },
        },
      },
    });

    if (!user) throw new AppError(404, 'Usuario no encontrado');
    return user;
  }
}

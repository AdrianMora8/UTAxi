import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from './users.service';
import { AppError } from '../middleware/errorHandler';

const makePrismaMock = () => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  vehicle: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

describe('UsersService', () => {
  const userId = 'user-1';
  const targetId = 'user-2';
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: UsersService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new UsersService(prisma as any);
  });

  describe('getMe', () => {
    it('returns user when found', async () => {
      const expected = { id: userId, email: 'test@uta.edu.ec' };
      prisma.user.findUnique.mockResolvedValue(expected);

      const result = await service.getMe(userId);

      expect(result).toEqual(expected);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.any(Object),
      });
    });

    it('throws AppError when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe(userId)).rejects.toEqual(
        new AppError(404, 'Usuario no encontrado'),
      );
    });
  });

  describe('updateMe', () => {
    it('updates user with provided data', async () => {
      const payload = { fullName: 'Nuevo Nombre' };
      const expected = { id: userId, fullName: 'Nuevo Nombre' };
      prisma.user.findUnique.mockResolvedValue({ id: userId });
      prisma.user.update.mockResolvedValue(expected);

      const result = await service.updateMe(userId, payload);

      expect(result).toEqual(expected);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: payload,
        select: expect.any(Object),
      });
    });
  });

  describe('createVehicle', () => {
    it('creates vehicle when none exists', async () => {
      const payload = {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        plateNumber: 'ABC1234',
        color: 'Blanco',
      };
      const expected = { id: 'veh-1', ...payload };
      prisma.vehicle.findUnique.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue(expected);

      const result = await service.createVehicle(userId, payload);

      expect(result).toEqual(expected);
      expect(prisma.vehicle.findUnique).toHaveBeenCalledWith({ where: { userId } });
      expect(prisma.vehicle.create).toHaveBeenCalledWith({
        data: { userId, ...payload },
      });
    });

    it('throws AppError when vehicle already exists', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({ id: 'veh-1' });

      await expect(
        service.createVehicle(userId, {
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
          plateNumber: 'ABC1234',
          color: 'Blanco',
        }),
      ).rejects.toEqual(
        new AppError(409, 'Ya tienes un vehículo registrado. Usa PATCH para actualizarlo.'),
      );
    });
  });

  describe('updateVehicle', () => {
    it('updates vehicle when it exists', async () => {
      const payload = { color: 'Negro' };
      const expected = { id: 'veh-1', color: 'Negro' };
      prisma.vehicle.findUnique.mockResolvedValue({ id: 'veh-1', userId });
      prisma.vehicle.update.mockResolvedValue(expected);

      const result = await service.updateVehicle(userId, payload);

      expect(result).toEqual(expected);
      expect(prisma.vehicle.findUnique).toHaveBeenCalledWith({ where: { userId } });
      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { userId },
        data: payload,
      });
    });

    it('throws AppError when vehicle does not exist', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(service.updateVehicle(userId, { color: 'Negro' })).rejects.toEqual(
        new AppError(404, 'No tienes vehículo registrado. Usa POST para crear uno.'),
      );
    });
  });

  describe('getPublicProfile', () => {
    it('returns public profile when found', async () => {
      const expected = { id: targetId, fullName: 'User 2' };
      prisma.user.findUnique.mockResolvedValue(expected);

      const result = await service.getPublicProfile(targetId);

      expect(result).toEqual(expected);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: targetId },
        select: expect.any(Object),
      });
    });

    it('throws AppError when public profile not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getPublicProfile(targetId)).rejects.toEqual(
        new AppError(404, 'Usuario no encontrado'),
      );
    });
  });
});

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { UsersService } from '../services/users.service';

const svc = new UsersService(prisma);

const updateMeSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  career: z.string().min(2).max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
  neighborhood: z.string().min(2).max(100).optional(),
});

const vehicleSchema = z.object({
  brand: z.string().min(2).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  plateNumber: z.string().min(4).max(10).toUpperCase(),
  color: z.string().min(2).max(30),
});

const updateVehicleSchema = vehicleSchema.partial();

export async function getMe(req: Request, res: Response) {
  const user = await svc.getMe(req.user!.id);
  res.json({ user });
}

export async function updateMe(req: Request, res: Response) {
  // Validar que el usuario está autenticado
  if (!req.user) {
    throw new Error('No estás autenticado');
  }

  const data = updateMeSchema.parse(req.body);
  const user = await svc.updateMe(req.user.id, data);
  res.json({ user });
}

export async function createVehicle(req: Request, res: Response) {
  const data = vehicleSchema.parse(req.body);
  const vehicle = await svc.createVehicle(req.user!.id, data);
  res.status(201).json({ vehicle });
}

export async function updateVehicle(req: Request, res: Response) {
  const data = updateVehicleSchema.parse(req.body);
  const vehicle = await svc.updateVehicle(req.user!.id, data);
  res.json({ vehicle });
}

export async function uploadVehiclePhoto(req: Request, res: Response) {
  if (!req.file) throw new Error('No se recibió ninguna imagen');

  const file = req.file as Express.Multer.File & { secure_url?: string };
  const photoUrl = file.secure_url ?? file.path;
  const vehicle = await svc.updateVehiclePhoto(req.user!.id, photoUrl);
  res.json({ vehicle });
}

export async function deleteVehicle(req: Request, res: Response) {
  await svc.deleteVehicle(req.user!.id);
  res.json({ message: 'Vehículo eliminado correctamente' });
}

export async function getPublicProfile(req: Request, res: Response) {
  const user = await svc.getPublicProfile(String(req.params.id));
  res.json({ user });
}

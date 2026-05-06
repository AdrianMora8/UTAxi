import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Server, Socket } from 'socket.io';
import { registerTrackingHandlers } from '../../src/socket/tracking.gateway';
import * as jwt from '../../src/utils/jwt';
import { prisma } from '../../src/config/database';

/**
 * Pruebas unitarias para el módulo de socket tracking
 * Verifica la autenticación, join/leave de salas, y emisión de ubicaciones
 */

vi.mock('../../src/utils/jwt');
vi.mock('../../src/config/database');

const mockVerifyAccessToken = vi.fn();
const mockJwt = jwt as unknown as { verifyAccessToken: typeof mockVerifyAccessToken };
mockJwt.verifyAccessToken = mockVerifyAccessToken;

describe('Tracking Socket Gateway', () => {
  let mockIo: Partial<Server>;
  let mockSocket: Partial<Socket>;
  let mockToSocket: Partial<Socket>;
  let socketHandlers: Record<string, Function>;
  let ioMiddlewares: Array<(socket: any, next: any) => void>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock del socket
    socketHandlers = {};
    mockSocket = {
      id: 'socket-123',
      data: {},
      handshake: {
        auth: { token: '' },
        headers: { authorization: '' },
      },
      on: vi.fn((event, handler) => {
        socketHandlers[event] = handler;
      }),
      emit: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
      to: vi.fn(() => mockToSocket),
    };

    // Mock de to() para retornar un socket que emite
    mockToSocket = {
      emit: vi.fn(),
    };

    // Mock del IO
    ioMiddlewares = [];
    mockIo = {
      use: vi.fn((middleware) => {
        ioMiddlewares.push(middleware);
      }),
      on: vi.fn((event, handler) => {
        if (event === 'connection') {
          // Simular conexión después de pasar middlewares
          handler(mockSocket);
        }
      }),
    };
  });

  describe('Authentication Middleware', () => {
    it('should reject connection without token', async () => {
      const mockSocket = {
        handshake: { auth: {}, headers: {} },
      };
      const mockNext = vi.fn();

      registerTrackingHandlers(mockIo as Server);

      const middleware = ioMiddlewares[0];
      await middleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Token') })
      );
    });

    it('should accept token from auth object', async () => {
      const mockSocket = {
        handshake: { auth: { token: 'valid-token' }, headers: {} },
        data: {},
      };
      const mockNext = vi.fn();

      mockVerifyAccessToken.mockReturnValue({
        userId: 'user-123',
        email: 'student@uta.edu.ec',
        role: 'STUDENT',
      });

      registerTrackingHandlers(mockIo as Server);

      const middleware = ioMiddlewares[0];
      await middleware(mockSocket, mockNext);

      expect(mockVerifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should accept token from authorization header', async () => {
      const mockSocket = {
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer valid-token' },
        },
        data: {},
      };
      const mockNext = vi.fn();

      mockVerifyAccessToken.mockReturnValue({
        userId: 'user-123',
        email: 'student@uta.edu.ec',
        role: 'STUDENT',
      });

      registerTrackingHandlers(mockIo as Server);

      const middleware = ioMiddlewares[0];
      await middleware(mockSocket, mockNext);

      expect(mockVerifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid token', async () => {
      const mockSocket = {
        handshake: { auth: { token: 'invalid-token' }, headers: {} },
        data: {},
      };
      const mockNext = vi.fn();

      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error('Token inválido');
      });

      registerTrackingHandlers(mockIo as Server);

      const middleware = ioMiddlewares[0];
      await middleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should populate socket.data with token payload', async () => {
      const mockSocket = {
        handshake: { auth: { token: 'valid-token' }, headers: {} },
        data: {},
      };
      const mockNext = vi.fn();

      mockVerifyAccessToken.mockReturnValue({
        userId: 'user-456',
        email: 'driver@uta.edu.ec',
        role: 'DRIVER',
      });

      registerTrackingHandlers(mockIo as Server);

      const middleware = ioMiddlewares[0];
      await middleware(mockSocket, mockNext);

      expect(mockSocket.data).toEqual({
        userId: 'user-456',
        email: 'driver@uta.edu.ec',
        role: 'DRIVER',
      });
    });
  });

  describe('join:trip event', () => {
    beforeEach(() => {
      mockVerifyAccessToken.mockReturnValue({
        userId: 'user-123',
        email: 'student@uta.edu.ec',
        role: 'STUDENT',
      });

      vi.spyOn(prisma.trip, 'findUnique' as any).mockResolvedValue({
        id: 'trip-123',
        driverId: 'driver-123',
        status: 'ACTIVE',
      });

      vi.spyOn(prisma.tripRequest, 'findFirst' as any).mockResolvedValue(null);
    });

    it('should reject when tripId is missing', async () => {
      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['join:trip'];
      await handler({});

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.stringContaining('tripId') })
      );
    });

    it('should reject when trip not found', async () => {
      (prisma.trip.findUnique as any).mockResolvedValue(null);

      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['join:trip'];
      await handler({ tripId: 'nonexistent' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.stringContaining('no encontrado') })
      );
    });

    it('should allow driver to join trip', async () => {
      (mockSocket as any).data = {
        userId: 'driver-123',
        email: 'driver@uta.edu.ec',
        role: 'DRIVER',
      };

      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['join:trip'];
      await handler({ tripId: 'trip-123' });

      expect(mockSocket.join).toHaveBeenCalledWith('trip:trip-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('joined:trip', {
        tripId: 'trip-123',
      });
    });

    it('should allow accepted passenger to join trip', async () => {
      (prisma.tripRequest.findFirst as any).mockResolvedValue({
        id: 'request-123',
        status: 'ACCEPTED',
      });

      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['join:trip'];
      await handler({ tripId: 'trip-123' });

      expect(mockSocket.join).toHaveBeenCalledWith('trip:trip-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('joined:trip', {
        tripId: 'trip-123',
      });
    });

    it('should reject unauthorized users', async () => {
      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['join:trip'];
      await handler({ tripId: 'trip-123' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.stringContaining('acceso') })
      );
    });
  });

  describe('leave:trip event', () => {
    it('should leave the trip room', () => {
      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['leave:trip'];
      handler({ tripId: 'trip-123' });

      expect(mockSocket.leave).toHaveBeenCalledWith('trip:trip-123');
    });
  });

  describe('location:update event', () => {
    beforeEach(() => {
      (mockSocket as any).data = {
        userId: 'driver-123',
        email: 'driver@uta.edu.ec',
        role: 'DRIVER',
      };

      vi.spyOn(prisma.trip, 'findUnique' as any).mockResolvedValue({
        id: 'trip-123',
        driverId: 'driver-123',
        status: 'IN_PROGRESS',
      });
    });

    it('should reject when missing required parameters', async () => {
      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['location:update'];
      await handler({ tripId: 'trip-123' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.stringContaining('requeridos') })
      );
    });

    it('should reject when trip not found', async () => {
      (prisma.trip.findUnique as any).mockResolvedValue(null);

      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['location:update'];
      await handler({ tripId: 'trip-123', lat: 0.1, lng: 0.2 });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.stringContaining('no encontrado') })
      );
    });

    it('should reject non-driver from sending location', async () => {
      (mockSocket as any).data = {
        userId: 'passenger-123',
        email: 'passenger@uta.edu.ec',
        role: 'STUDENT',
      };

      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['location:update'];
      await handler({ tripId: 'trip-123', lat: 0.1, lng: 0.2 });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.stringContaining('conductor') })
      );
    });

    it('should reject location update when trip is not IN_PROGRESS', async () => {
      (prisma.trip.findUnique as any).mockResolvedValue({
        id: 'trip-123',
        driverId: 'driver-123',
        status: 'COMPLETED',
      });

      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['location:update'];
      await handler({ tripId: 'trip-123', lat: 0.1, lng: 0.2 });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.stringContaining('IN_PROGRESS') })
      );
    });

    it('should broadcast location to other passengers', async () => {
      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['location:update'];
      await handler({ tripId: 'trip-123', lat: 0.1, lng: 0.2 });

      expect(mockSocket.to).toHaveBeenCalledWith('trip:trip-123');
      expect(mockToSocket.emit).toHaveBeenCalledWith(
        'location:update',
        expect.objectContaining({
          lat: 0.1,
          lng: 0.2,
          driverId: 'driver-123',
        })
      );
    });

    it('should include timestamp in location update', async () => {
      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['location:update'];
      await handler({ tripId: 'trip-123', lat: 0.1, lng: 0.2 });

      expect(mockToSocket.emit).toHaveBeenCalledWith(
        'location:update',
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('disconnect event', () => {
    it('should handle disconnect gracefully', () => {
      registerTrackingHandlers(mockIo as Server);

      const handler = socketHandlers['disconnect'];
      expect(() => handler('client namespace disconnect')).not.toThrow();
    });
  });
});

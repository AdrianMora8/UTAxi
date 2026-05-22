import React from 'react';
import { Alert } from 'react-native';
import { requestsApi } from '../../api/requests.api';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import HistorialPasajeroScreen from '../../screens/app/HistorialPasajeroScreen';

jest.mock('../../api/requests.api', () => ({
  requestsApi: {
    getMyRequests: jest.fn(),
    createRequest: jest.fn(),
  },
}));

jest.mock('../../components/RatingModal', () => ({
  __esModule: true,
  default: ({ targetName }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: 'rating-modal' },
      React.createElement(Text, null, `Calificar a ${targetName}`),
    );
  },
}));

const mockGetMyRequests = requestsApi.getMyRequests as jest.Mock;
const mockCreateRequest = requestsApi.createRequest as jest.Mock;

const nav = {} as any;
const route = {} as any;

const makeDriver = (overrides: Record<string, unknown> = {}) => ({
  id: 'driver-1',
  fullName: 'Carlos Pérez',
  reputationScore: 4.5,
  ...overrides,
});

const makeRequest = (overrides: Record<string, unknown> = {}) => ({
  id: 'req-1',
  tripId: 'trip-1',
  passengerId: 'p1',
  status: 'COMPLETED',
  rejectionCount: 0,
  createdAt: new Date().toISOString(),
  trip: {
    id: 'trip-1',
    originZone: 'Campus Norte',
    destinationZone: 'Centro',
    departureTime: new Date().toISOString(),
    pricePerSeat: 1.5,
    status: 'COMPLETED',
    driver: makeDriver(),
  },
  rating: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
});

describe('HistorialPasajeroScreen — renderizado', () => {
  it('no muestra contenido mientras carga', () => {
    mockGetMyRequests.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    expect(screen.queryByText('Sin historial aún')).toBeNull();
    expect(screen.queryByText('COMPLETADO')).toBeNull();
  });

  it('muestra estado vacío cuando no hay historial', async () => {
    mockGetMyRequests.mockResolvedValue({ data: { requests: [] } });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Sin historial aún')).toBeTruthy());
  });

  it('filtra solicitudes PENDING y ACCEPTED fuera del historial', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [
          makeRequest({ status: 'PENDING' }),
          makeRequest({ id: 'req-2', status: 'ACCEPTED' }),
        ],
      },
    });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Sin historial aún')).toBeTruthy());
  });
});

describe('HistorialPasajeroScreen — tarjeta COMPLETADO', () => {
  it('muestra badge COMPLETADO y zonas del viaje', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'COMPLETED' })] },
    });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('COMPLETADO')).toBeTruthy());
    expect(screen.getByText('Campus Norte')).toBeTruthy();
    expect(screen.getByText('Centro')).toBeTruthy();
  });

  it('muestra botón Calificar si no hay rating', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'COMPLETED', rating: null })] },
    });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Calificar')).toBeTruthy());
  });

  it('muestra estrellas si ya tiene rating', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [
          makeRequest({
            status: 'COMPLETED',
            rating: { id: 'r1', score: 4, comment: 'Muy bien' },
          }),
        ],
      },
    });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    // Esperar que los datos carguen antes de verificar ausencia de 'Calificar'
    await waitFor(() => expect(screen.getByText('COMPLETADO')).toBeTruthy());
    expect(screen.queryByText('Calificar')).toBeNull();
    expect(screen.getByText('"Muy bien"')).toBeTruthy();
  });

  it('abre el RatingModal al presionar Calificar', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'COMPLETED' })] },
    });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Calificar')).toBeTruthy());
    fireEvent.press(screen.getByText('Calificar'));
    await waitFor(() => expect(screen.getByTestId('rating-modal')).toBeTruthy());
    expect(screen.getByText('Calificar a Carlos Pérez')).toBeTruthy();
  });
});

describe('HistorialPasajeroScreen — tarjeta RECHAZADO', () => {
  it('muestra badge RECHAZADO', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'REJECTED', rejectionCount: 1 })] },
    });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('RECHAZADO')).toBeTruthy());
  });

  it('muestra botón Reintentar si rejectionCount < 3', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'REJECTED', rejectionCount: 1 })] },
    });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Reintentar')).toBeTruthy());
  });

  it('muestra BLOQUEADO cuando rejectionCount >= 3', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'REJECTED', rejectionCount: 3 })] },
    });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('BLOQUEADO')).toBeTruthy());
    expect(screen.queryByText('Reintentar')).toBeNull();
  });

  it('llama a createRequest al presionar Reintentar', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'REJECTED', rejectionCount: 1 })] },
    });
    mockCreateRequest.mockResolvedValue({ data: { request: { id: 'req-new' } } });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Reintentar')).toBeTruthy());
    fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(mockCreateRequest).toHaveBeenCalledWith('trip-1'));
  });
});

describe('HistorialPasajeroScreen — tarjeta CANCELADO', () => {
  it('muestra badge CANCELADO', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'CANCELLED', rejectionCount: 0 })] },
    });
    renderWithProviders(<HistorialPasajeroScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('CANCELADO')).toBeTruthy());
  });
});

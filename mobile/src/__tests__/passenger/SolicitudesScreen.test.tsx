import React from 'react';
import { Alert } from 'react-native';
import { requestsApi } from '../../api/requests.api';
import { tripsApi } from '../../api/trips.api';
import { ratingsApi } from '../../api/ratings.api';
import { reportsApi } from '../../api/reports.api';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import SolicitudesScreen from '../../screens/app/SolicitudesScreen';

jest.mock('../../api/requests.api', () => ({
  requestsApi: {
    getRequestsByTrip: jest.fn(),
    respondToRequest: jest.fn(),
    markArrival: jest.fn(),
  },
}));

jest.mock('../../api/trips.api', () => ({
  tripsApi: { getTripById: jest.fn() },
}));

jest.mock('../../api/ratings.api', () => ({
  ratingsApi: { createRating: jest.fn() },
}));

jest.mock('../../api/reports.api', () => ({
  reportsApi: { createReport: jest.fn() },
}));

jest.mock('../../hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
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

const mockGetRequestsByTrip = requestsApi.getRequestsByTrip as jest.Mock;
const mockRespondToRequest = requestsApi.respondToRequest as jest.Mock;
const mockMarkArrival = requestsApi.markArrival as jest.Mock;
const mockGetTripById = tripsApi.getTripById as jest.Mock;
const mockCreateReport = reportsApi.createReport as jest.Mock;

const TRIP_ID = 'trip-1';
const nav = { navigate: jest.fn(), goBack: jest.fn() } as any;
const route = { params: { tripId: TRIP_ID } } as any;

const mockTrip = {
  id: TRIP_ID,
  driverId: 'driver-1',
  originZone: 'Campus Norte',
  destinationZone: 'Centro',
  departureTime: new Date(Date.now() + 30 * 60000).toISOString(),
  totalSeats: 4,
  availableSeats: 2,
  pricePerSeat: 1.5,
  status: 'SCHEDULED',
  driver: { id: 'driver-1', fullName: 'Carlos Pérez', reputationScore: 4.5 },
};

const makePassenger = (overrides: Record<string, unknown> = {}) => ({
  id: 'passenger-1',
  fullName: 'Luis García',
  career: 'Sistemas',
  reputationScore: 4.2,
  totalTrips: 5,
  ...overrides,
});

const makePendingRequest = (overrides: Record<string, unknown> = {}) => ({
  id: 'req-1',
  tripId: TRIP_ID,
  passengerId: 'passenger-1',
  status: 'PENDING',
  rejectionCount: 0,
  createdAt: new Date().toISOString(),
  passenger: makePassenger(),
  ...overrides,
});

const makeAcceptedRequest = (overrides: Record<string, unknown> = {}) => ({
  ...makePendingRequest({ id: 'req-2', status: 'ACCEPTED', ...overrides }),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  mockGetTripById.mockResolvedValue({ data: { trip: mockTrip } });
  mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [] } });
  mockCreateReport.mockResolvedValue({});
});

describe('SolicitudesScreen — renderizado', () => {
  it('no muestra contenido mientras carga', () => {
    mockGetRequestsByTrip.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    expect(screen.queryByText('PENDIENTES')).toBeNull();
  });

  it('muestra encabezado con ruta del viaje', async () => {
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText(/Campus Norte.*Centro/)).toBeTruthy());
  });

  it('muestra sección PENDIENTES vacía por defecto', async () => {
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('PENDIENTES')).toBeTruthy());
    expect(screen.getByText('Sin solicitudes pendientes')).toBeTruthy();
  });

  it('muestra estado completamente vacío sin solicitudes', async () => {
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Aún no hay solicitudes')).toBeTruthy());
  });
});

describe('SolicitudesScreen — solicitudes pendientes', () => {
  it('renderiza tarjeta de pasajero pendiente', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makePendingRequest()] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Luis G.')).toBeTruthy());
    expect(screen.getByText('Sistemas')).toBeTruthy();
  });

  it('muestra banner de reenvío si rejectionCount > 0', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makePendingRequest({ rejectionCount: 2 })] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText(/Reenvío/)).toBeTruthy());
    expect(screen.getByText(/2\/3 rechazos/)).toBeTruthy();
  });

  it('muestra Alert de confirmación al presionar Aceptar', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makePendingRequest()] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Aceptar')).toBeTruthy());
    fireEvent.press(screen.getByText('Aceptar'));
    expect(Alert.alert).toHaveBeenCalledWith(
      '¿Confirmas aceptar esta solicitud?',
      undefined,
      expect.any(Array),
    );
  });

  it('llama a respondToRequest con ACCEPT al confirmar', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makePendingRequest()] },
    });
    mockRespondToRequest.mockResolvedValue({ data: { request: { id: 'req-1', status: 'ACCEPTED' } } });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Aceptar')).toBeTruthy());
    fireEvent.press(screen.getByText('Aceptar'));
    const alertSpy = Alert.alert as jest.Mock;
    const buttons: any[] = alertSpy.mock.calls[0][2];
    buttons.find((b: any) => b.text === 'Aceptar').onPress();
    await waitFor(() =>
      expect(mockRespondToRequest).toHaveBeenCalledWith('req-1', 'ACCEPT'),
    );
  });

  it('llama a respondToRequest con REJECT al confirmar rechazo', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makePendingRequest()] },
    });
    mockRespondToRequest.mockResolvedValue({ data: { request: { id: 'req-1', status: 'REJECTED' } } });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Rechazar')).toBeTruthy());
    fireEvent.press(screen.getByText('Rechazar'));
    const alertSpy = Alert.alert as jest.Mock;
    const buttons: any[] = alertSpy.mock.calls[0][2];
    buttons.find((b: any) => b.text === 'Rechazar').onPress();
    await waitFor(() =>
      expect(mockRespondToRequest).toHaveBeenCalledWith('req-1', 'REJECT'),
    );
  });
});

describe('SolicitudesScreen — pasajeros aceptados', () => {
  it('muestra sección PASAJEROS ACEPTADOS', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makeAcceptedRequest()] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('PASAJEROS ACEPTADOS')).toBeTruthy());
  });

  it('muestra botón Marcar llegada para pasajero aceptado', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makeAcceptedRequest({ arrivedAt: null })] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Marcar llegada')).toBeTruthy());
  });

  it('llama a markArrival al presionar Marcar llegada', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makeAcceptedRequest({ arrivedAt: null })] },
    });
    mockMarkArrival.mockResolvedValue({ data: { request: { id: 'req-2', arrivedAt: new Date().toISOString() } } });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Marcar llegada')).toBeTruthy());
    fireEvent.press(screen.getByText('Marcar llegada'));
    await waitFor(() =>
      expect(mockMarkArrival).toHaveBeenCalledWith('req-2', true),
    );
  });

  it('abre RatingModal al presionar Calificar en pasajero aceptado', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makeAcceptedRequest({ rating: null })] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Calificar')).toBeTruthy());
    fireEvent.press(screen.getByText('Calificar'));
    await waitFor(() => expect(screen.getByTestId('rating-modal')).toBeTruthy());
  });
});

describe('SolicitudesScreen — historial', () => {
  it('muestra sección HISTORIAL con solicitudes rechazadas', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makePendingRequest({ id: 'req-h', status: 'REJECTED', rejectionCount: 1 })] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('HISTORIAL')).toBeTruthy());
    expect(screen.getByText('Rechazado')).toBeTruthy();
  });
});

describe('SolicitudesScreen — reportar pasajero', () => {
  it('muestra el botón de reportar para pasajeros aceptados', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makeAcceptedRequest()] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByTestId('report-passenger-btn')).toBeTruthy());
  });

  it('presionar el botón flag abre el modal de reporte', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makeAcceptedRequest()] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByTestId('report-passenger-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('report-passenger-btn'));
    await waitFor(() => expect(screen.getByText('Reportar pasajero')).toBeTruthy());
    expect(screen.getByText('Enviar Reporte')).toBeTruthy();
  });

  it('muestra Alert si la descripción es menor a 10 caracteres', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makeAcceptedRequest()] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByTestId('report-passenger-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('report-passenger-btn'));
    await waitFor(() => expect(screen.getByText('Enviar Reporte')).toBeTruthy());

    const input = screen.getByPlaceholderText(/Describe lo que ocurrió/i);
    fireEvent.changeText(input, 'corta');
    fireEvent.press(screen.getByText('Enviar Reporte'));

    expect(Alert.alert).toHaveBeenCalledWith('Descripción muy corta', expect.any(String));
    expect(mockCreateReport).not.toHaveBeenCalled();
  });

  it('llama a reportsApi.createReport con los datos correctos', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makeAcceptedRequest({ passengerId: 'passenger-1' })] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByTestId('report-passenger-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('report-passenger-btn'));
    await waitFor(() => expect(screen.getByText('Enviar Reporte')).toBeTruthy());

    const input = screen.getByPlaceholderText(/Describe lo que ocurrió/i);
    fireEvent.changeText(input, 'Conducta muy inapropiada durante el trayecto');
    fireEvent.press(screen.getByText('Enviar Reporte'));

    await waitFor(() =>
      expect(mockCreateReport).toHaveBeenCalledWith({
        reportedId: 'passenger-1',
        reason: 'INAPPROPRIATE_BEHAVIOR',
        description: 'Conducta muy inapropiada durante el trayecto',
      }),
    );
  });

  it('cierra el modal y muestra Alert de éxito tras enviar', async () => {
    mockGetRequestsByTrip.mockResolvedValue({
      data: { requests: [makeAcceptedRequest()] },
    });
    renderWithProviders(<SolicitudesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByTestId('report-passenger-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('report-passenger-btn'));
    await waitFor(() => expect(screen.getByText('Enviar Reporte')).toBeTruthy());

    const input = screen.getByPlaceholderText(/Describe lo que ocurrió/i);
    fireEvent.changeText(input, 'Conducta muy inapropiada durante el trayecto');
    fireEvent.press(screen.getByText('Enviar Reporte'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Reporte enviado', expect.any(String)),
    );
  });
});

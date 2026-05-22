import React from 'react';
import { Alert } from 'react-native';
import { requestsApi } from '../../api/requests.api';
import { paymentsApi } from '../../api/payments.api';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import MisViajesScreen from '../../screens/app/MisViajesScreen';

jest.mock('../../api/requests.api', () => ({
  requestsApi: {
    getMyRequests: jest.fn(),
    cancelRequest: jest.fn(),
    createRequest: jest.fn(),
  },
}));

jest.mock('../../api/payments.api', () => ({
  paymentsApi: {
    payWithWallet: jest.fn(),
  },
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

const mockGetMyRequests = requestsApi.getMyRequests as jest.Mock;
const mockCancelRequest = requestsApi.cancelRequest as jest.Mock;
const mockCreateRequest = requestsApi.createRequest as jest.Mock;
const mockPayWithWallet = paymentsApi.payWithWallet as jest.Mock;

const nav = { navigate: jest.fn(), goBack: jest.fn() } as any;
const route = {} as any;

// Fecha futura para que los tests no dependan de "minsLeft"
const FUTURE_DEPARTURE = new Date(Date.now() + 90 * 60000).toISOString();

function makeTripData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trip-1',
    originZone: 'Atocha',
    destinationZone: 'Bellavista',
    departureTime: FUTURE_DEPARTURE,
    pricePerSeat: 1.5,
    status: 'SCHEDULED',
    driver: { id: 'driver-1', fullName: 'Carlos Pérez', reputationScore: 4.5 },
    ...overrides,
  };
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    tripId: 'trip-1',
    passengerId: 'passenger-1',
    status: 'PENDING',
    rejectionCount: 0,
    createdAt: new Date().toISOString(),
    trip: makeTripData(),
    rating: null,
    payment: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  mockGetMyRequests.mockResolvedValue({ data: { requests: [] } });
});

// ─────────────────────────────────────────────
// Renderizado general
// ─────────────────────────────────────────────
describe('MisViajesScreen — renderizado', () => {
  it('muestra el título Mis Viajes', async () => {
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Mis Viajes')).toBeTruthy());
  });

  it('no muestra contenido de lista mientras carga', () => {
    mockGetMyRequests.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    expect(screen.queryByText('No tienes solicitudes activas')).toBeNull();
    expect(screen.queryByText('PENDIENTE')).toBeNull();
  });

  it('muestra estado de error con botón Reintentar', async () => {
    mockGetMyRequests.mockRejectedValue(new Error('Network Error'));
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Error de conexión')).toBeTruthy());
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// Tabs y estados vacíos
// ─────────────────────────────────────────────
describe('MisViajesScreen — tabs y vacío', () => {
  it('muestra tabs Activas e Historial', async () => {
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Activas')).toBeTruthy());
    expect(screen.getByText('Historial')).toBeTruthy();
  });

  it('tab Activas vacía muestra mensaje correcto', async () => {
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('No tienes solicitudes activas')).toBeTruthy());
  });

  it('tab Historial vacía muestra mensaje correcto', async () => {
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Activas')).toBeTruthy());
    fireEvent.press(screen.getByText('Historial'));
    await waitFor(() => expect(screen.getByText('Sin viajes completados')).toBeTruthy());
  });

  it('tab Activas muestra solo PENDING y ACCEPTED', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [
          makeRequest({ id: 'r1', status: 'PENDING' }),
          makeRequest({ id: 'r2', status: 'COMPLETED' }), // no debe aparecer en Activas
        ],
      },
    });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('PENDIENTE')).toBeTruthy());
    expect(screen.queryByText('COMPLETADO')).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Tarjeta PENDIENTE
// ─────────────────────────────────────────────
describe('MisViajesScreen — tarjeta PENDIENTE', () => {
  beforeEach(() => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'PENDING' })] },
    });
  });

  it('muestra badge PENDIENTE, ruta y botón Cancelar', async () => {
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('PENDIENTE')).toBeTruthy());
    expect(screen.getByText('Atocha')).toBeTruthy();
    expect(screen.getByText('Bellavista')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('muestra nombre abreviado del conductor', async () => {
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Carlos P.')).toBeTruthy());
  });

  it('presionar Cancelar abre Alert de confirmación', async () => {
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Cancelar')).toBeTruthy());
    fireEvent.press(screen.getByText('Cancelar'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Cancelar solicitud',
      '¿Seguro que quieres cancelar esta solicitud?',
      expect.any(Array),
    );
  });

  it('confirmar en Alert llama a cancelRequest con el id correcto', async () => {
    mockCancelRequest.mockResolvedValue({ data: { refunded: false, message: 'ok' } });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Cancelar')).toBeTruthy());
    fireEvent.press(screen.getByText('Cancelar'));

    const alertSpy = Alert.alert as jest.Mock;
    const buttons: any[] = alertSpy.mock.calls[0][2];
    buttons.find((b: any) => b.text === 'Sí, cancelar').onPress();

    await waitFor(() => expect(mockCancelRequest).toHaveBeenCalledWith('req-1'));
  });
});

// ─────────────────────────────────────────────
// Tarjeta ACEPTADA
// ─────────────────────────────────────────────
describe('MisViajesScreen — tarjeta ACEPTADA', () => {
  it('muestra badge ACEPTADO', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'ACCEPTED' })] },
    });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('ACEPTADO')).toBeTruthy());
  });

  it('muestra botón Pagar reserva cuando no está pagado y viaje SCHEDULED', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [makeRequest({ status: 'ACCEPTED', payment: null })],
      },
    });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Pagar reserva')).toBeTruthy());
  });

  it('muestra botón Cancelar reserva para viaje ACCEPTED + SCHEDULED', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [makeRequest({ status: 'ACCEPTED', payment: null })],
      },
    });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Cancelar reserva')).toBeTruthy());
  });

  it('muestra badge PAGADO cuando el pago está confirmado', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [
          makeRequest({
            status: 'ACCEPTED',
            payment: { id: 'pay-1', amount: 1.5, status: 'CONFIRMED' },
          }),
        ],
      },
    });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('PAGADO')).toBeTruthy());
    expect(screen.queryByText('Pagar reserva')).toBeNull();
  });

  it('muestra botón Pagar ahora cuando el viaje está IN_PROGRESS', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [
          makeRequest({
            status: 'ACCEPTED',
            payment: null,
            trip: makeTripData({ status: 'IN_PROGRESS' }),
          }),
        ],
      },
    });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Pagar ahora')).toBeTruthy());
    expect(screen.queryByText('Pagar reserva')).toBeNull();
  });

  it('presionar Pagar reserva llama a payWithWallet con el requestId', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'ACCEPTED', payment: null })] },
    });
    mockPayWithWallet.mockResolvedValue({ data: { amount: 1.5 } });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Pagar reserva')).toBeTruthy());
    fireEvent.press(screen.getByText('Pagar reserva'));
    await waitFor(() => expect(mockPayWithWallet).toHaveBeenCalledWith('req-1'));
  });

  it('presionar Cancelar reserva abre Alert con mensaje de reembolso', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'ACCEPTED', payment: null })] },
    });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Cancelar reserva')).toBeTruthy());
    fireEvent.press(screen.getByText('Cancelar reserva'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Cancelar reserva',
      expect.any(String),
      expect.any(Array),
    );
  });
});

// ─────────────────────────────────────────────
// Tab Historial — tarjeta COMPLETADA
// ─────────────────────────────────────────────
describe('MisViajesScreen — tab Historial (COMPLETADO)', () => {
  beforeEach(() => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [
          makeRequest({
            id: 'req-done',
            status: 'COMPLETED',
            trip: makeTripData({ status: 'COMPLETED' }),
            rating: null,
          }),
        ],
      },
    });
  });

  function switchToHistory() {
    fireEvent.press(screen.getByText('Historial'));
  }

  it('muestra badge COMPLETADO en tab Historial', async () => {
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Activas')).toBeTruthy());
    switchToHistory();
    await waitFor(() => expect(screen.getByText('COMPLETADO')).toBeTruthy());
  });

  it('muestra botón Calificar cuando no hay rating', async () => {
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Activas')).toBeTruthy());
    switchToHistory();
    await waitFor(() => expect(screen.getByText('Calificar')).toBeTruthy());
  });

  it('presionar Calificar abre el RatingModal con el nombre del conductor', async () => {
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Activas')).toBeTruthy());
    switchToHistory();
    await waitFor(() => expect(screen.getByText('Calificar')).toBeTruthy());
    fireEvent.press(screen.getByText('Calificar'));
    await waitFor(() => expect(screen.getByTestId('rating-modal')).toBeTruthy());
    expect(screen.getByText('Calificar a Carlos Pérez')).toBeTruthy();
  });

  it('no muestra botón Calificar cuando ya tiene rating', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [
          makeRequest({
            id: 'req-rated',
            status: 'COMPLETED',
            trip: makeTripData({ status: 'COMPLETED' }),
            rating: { id: 'r1', score: 5, comment: null },
          }),
        ],
      },
    });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Activas')).toBeTruthy());
    switchToHistory();
    await waitFor(() => expect(screen.getByText('COMPLETADO')).toBeTruthy());
    expect(screen.queryByText('Calificar')).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Acciones y feedback adicional
// ─────────────────────────────────────────────
describe('MisViajesScreen — acciones y feedback', () => {
  it('botón Buscar viajes llama a navigation.goBack', async () => {
    // El estado vacío de Activas muestra un botón "Buscar viajes"
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Buscar viajes')).toBeTruthy());
    fireEvent.press(screen.getByText('Buscar viajes'));
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  it('pago exitoso muestra Alert con el monto descontado', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'ACCEPTED', payment: null })] },
    });
    mockPayWithWallet.mockResolvedValue({ data: { amount: 1.5 } });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Pagar reserva')).toBeTruthy());
    fireEvent.press(screen.getByText('Pagar reserva'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Pago exitoso',
        'Se descontaron $1.50 de tu U-Wallet.',
      ),
    );
  });

  it('error en pago muestra Alert de error', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'ACCEPTED', payment: null })] },
    });
    mockPayWithWallet.mockRejectedValue({
      response: { data: { error: 'Saldo insuficiente' } },
    });
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Pagar reserva')).toBeTruthy());
    fireEvent.press(screen.getByText('Pagar reserva'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error al pagar', 'Saldo insuficiente'),
    );
  });

  it('error en cancelación muestra Alert de error', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'PENDING' })] },
    });
    mockCancelRequest.mockRejectedValue(new Error('fail'));
    renderWithProviders(<MisViajesScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Cancelar')).toBeTruthy());
    fireEvent.press(screen.getByText('Cancelar'));
    const alertSpy = Alert.alert as jest.Mock;
    const buttons: any[] = alertSpy.mock.calls[0][2];
    buttons.find((b: any) => b.text === 'Sí, cancelar').onPress();
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No se pudo cancelar la solicitud'),
    );
  });
});

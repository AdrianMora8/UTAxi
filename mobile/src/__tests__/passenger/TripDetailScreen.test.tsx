import React from 'react';
import { Alert } from 'react-native';
import { tripsApi } from '../../api/trips.api';
import { requestsApi } from '../../api/requests.api';
import { useAuthStore } from '../../store/authStore';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import TripDetailScreen from '../../screens/app/TripDetailScreen';

jest.mock('../../api/trips.api', () => ({
  tripsApi: { getTripById: jest.fn() },
}));

jest.mock('../../api/requests.api', () => ({
  requestsApi: { createRequest: jest.fn() },
}));

jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const mockGetTripById = tripsApi.getTripById as jest.Mock;
const mockCreateRequest = requestsApi.createRequest as jest.Mock;

const mockUser = {
  id: 'passenger-1',
  email: 'ana@uta.edu.ec',
  fullName: 'Ana Torres',
  role: 'STUDENT',
  status: 'ACTIVE',
  emailVerified: true,
  reputationScore: 4.8,
  photoUrl: null,
  career: null,
  phone: null,
  neighborhood: null,
};

const nav = { navigate: jest.fn(), goBack: jest.fn() } as any;
const makeRoute = (tripId = 'trip-1') => ({ params: { tripId } }) as any;

const mockTrip = {
  id: 'trip-1',
  driverId: 'driver-1',
  originZone: 'Campus Norte',
  destinationZone: 'Centro',
  departureTime: new Date(Date.now() + 60 * 60000).toISOString(),
  totalSeats: 4,
  availableSeats: 3,
  pricePerSeat: 1.5,
  notes: null,
  rules: 'No fumar\nNo mascotas',
  status: 'SCHEDULED',
  driver: {
    id: 'driver-1',
    fullName: 'Carlos Pérez',
    reputationScore: 4.7,
    career: 'Civil',
    vehicle: {
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
      color: 'Blanco',
      plateNumber: 'ABC-1234',
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  (useAuthStore as jest.Mock).mockImplementation(
    (selector: (s: any) => any) => selector({ user: mockUser }),
  );
});

describe('TripDetailScreen — renderizado', () => {
  it('no muestra contenido mientras carga', () => {
    mockGetTripById.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    expect(screen.queryByText('Detalles del Viaje')).toBeNull();
  });

  it('muestra error si la API falla', async () => {
    mockGetTripById.mockRejectedValue(new Error('Network Error'));
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() =>
      expect(screen.getByText('No se pudo cargar el viaje')).toBeTruthy(),
    );
  });

  it('muestra el título y el nombre corto del conductor', async () => {
    mockGetTripById.mockResolvedValue({ data: { trip: mockTrip } });
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() => expect(screen.getByText('Detalles del Viaje')).toBeTruthy());
    expect(screen.getByText('Carlos P.')).toBeTruthy();
  });

  it('muestra la info del vehículo con matrícula', async () => {
    mockGetTripById.mockResolvedValue({ data: { trip: mockTrip } });
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() => expect(screen.getByText('Toyota Corolla')).toBeTruthy());
    expect(screen.getByText('ABC-1234')).toBeTruthy();
  });

  it('muestra origen y destino de la ruta', async () => {
    mockGetTripById.mockResolvedValue({ data: { trip: mockTrip } });
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() => expect(screen.getByText('Campus Norte')).toBeTruthy());
    expect(screen.getByText('Centro')).toBeTruthy();
  });

  it('muestra precio y asientos disponibles', async () => {
    mockGetTripById.mockResolvedValue({ data: { trip: mockTrip } });
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() => expect(screen.getByText('$1.50')).toBeTruthy());
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('muestra las reglas del viaje', async () => {
    mockGetTripById.mockResolvedValue({ data: { trip: mockTrip } });
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() => expect(screen.getByText('No fumar')).toBeTruthy());
    expect(screen.getByText('No mascotas')).toBeTruthy();
  });
});

describe('TripDetailScreen — botón de solicitud', () => {
  it('muestra "Solicitar Unirse" para viaje de otro conductor', async () => {
    mockGetTripById.mockResolvedValue({ data: { trip: mockTrip } });
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() => expect(screen.getByText('Solicitar Unirse  →')).toBeTruthy());
  });

  it('muestra "Tu viaje" cuando el usuario es el conductor', async () => {
    mockGetTripById.mockResolvedValue({
      data: { trip: { ...mockTrip, driverId: 'passenger-1' } },
    });
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() => expect(screen.getByText('Tu viaje')).toBeTruthy());
  });

  it('muestra "Sin asientos disponibles" cuando availableSeats === 0', async () => {
    mockGetTripById.mockResolvedValue({
      data: { trip: { ...mockTrip, availableSeats: 0 } },
    });
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() => expect(screen.getByText('Sin asientos disponibles')).toBeTruthy());
  });

  it('muestra Alert de confirmación al presionar Solicitar Unirse', async () => {
    mockGetTripById.mockResolvedValue({ data: { trip: mockTrip } });
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() => expect(screen.getByText('Solicitar Unirse  →')).toBeTruthy());
    fireEvent.press(screen.getByText('Solicitar Unirse  →'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Confirmar solicitud',
      expect.stringContaining('Carlos P'),
      expect.any(Array),
    );
  });

  it('llama a createRequest al confirmar en el Alert', async () => {
    mockGetTripById.mockResolvedValue({ data: { trip: mockTrip } });
    mockCreateRequest.mockResolvedValue({ data: { request: { id: 'req-new' } } });
    renderWithProviders(<TripDetailScreen navigation={nav} route={makeRoute()} />);
    await waitFor(() => expect(screen.getByText('Solicitar Unirse  →')).toBeTruthy());
    fireEvent.press(screen.getByText('Solicitar Unirse  →'));

    const alertSpy = Alert.alert as jest.Mock;
    const buttons: any[] = alertSpy.mock.calls[0][2];
    const confirmBtn = buttons.find((b: any) => b.text === 'Solicitar');
    confirmBtn.onPress();

    await waitFor(() => expect(mockCreateRequest).toHaveBeenCalledWith('trip-1'));
  });
});

import React from 'react';
import { Alert } from 'react-native';
import { tripsApi } from '../../api/trips.api';
import { requestsApi } from '../../api/requests.api';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import HomePasajeroScreen from '../../screens/app/HomePasajeroScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../api/trips.api', () => ({
  tripsApi: { getTrips: jest.fn() },
}));

jest.mock('../../api/requests.api', () => ({
  requestsApi: { getMyRequests: jest.fn() },
}));

jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockUseNavigation = useNavigation as jest.Mock;
const mockGetTrips = tripsApi.getTrips as jest.Mock;
const mockGetMyRequests = requestsApi.getMyRequests as jest.Mock;

const mockUser = {
  id: 'passenger-1',
  email: 'ana@uta.edu.ec',
  fullName: 'Ana Torres',
  role: 'STUDENT',
  status: 'ACTIVE',
  emailVerified: true,
  reputationScore: 4.8,
  photoUrl: null,
  career: 'Ingeniería',
  phone: null,
  neighborhood: null,
};

const makeTrip = (overrides: Record<string, unknown> = {}) => ({
  id: 'trip-1',
  driverId: 'driver-1',
  originZone: 'Atocha',
  destinationZone: 'Bellavista',
  departureTime: new Date(Date.now() + 30 * 60000).toISOString(),
  totalSeats: 4,
  availableSeats: 3,
  pricePerSeat: 1.5,
  notes: null,
  rules: null,
  status: 'SCHEDULED',
  driver: {
    id: 'driver-1',
    fullName: 'Carlos Pérez',
    reputationScore: 4.5,
    career: 'Civil',
    vehicle: null,
  },
  ...overrides,
});

const emptyResponse = { data: { trips: [], total: 0, page: 1, limit: 20 } };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
    goBack: jest.fn(),
    getParent: jest.fn().mockReturnValue({ navigate: jest.fn() }),
  });
  (useAuthStore as jest.Mock).mockImplementation(
    (selector: (s: any) => any) => selector({ user: mockUser }),
  );
  mockGetMyRequests.mockResolvedValue({ data: { requests: [] } });
});

describe('HomePasajeroScreen — renderizado', () => {
  it('muestra el título Buscar Viaje', async () => {
    mockGetTrips.mockResolvedValue(emptyResponse);
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getByText('Buscar Viaje')).toBeTruthy());
  });

  it('no muestra contenido mientras carga', () => {
    mockGetTrips.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<HomePasajeroScreen />);
    expect(screen.queryByText('No hay viajes disponibles')).toBeNull();
    expect(screen.queryByText('Reservar')).toBeNull();
  });

  it('muestra estado vacío cuando no hay viajes', async () => {
    mockGetTrips.mockResolvedValue(emptyResponse);
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() =>
      expect(screen.getByText('No hay viajes disponibles')).toBeTruthy(),
    );
  });

  it('muestra estado de error con botón reintentar', async () => {
    mockGetTrips.mockRejectedValue(new Error('Network Error'));
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getByText('Error de conexión')).toBeTruthy());
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });

  it('renderiza tarjetas con origen y destino del viaje', async () => {
    mockGetTrips.mockResolvedValue({ data: { trips: [makeTrip()], total: 1, page: 1, limit: 20 } });
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getByText('Atocha')).toBeTruthy());
    expect(screen.getByText('Bellavista')).toBeTruthy();
  });
});

describe('HomePasajeroScreen — filtros y búsqueda', () => {
  it('activa chip de filtro y pasa destinationZone a la query', async () => {
    mockGetTrips.mockResolvedValue(emptyResponse);
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getAllByText('Campus Norte')[0]).toBeTruthy());
    fireEvent.press(screen.getAllByText('Campus Norte')[0]);
    await waitFor(() =>
      expect(mockGetTrips).toHaveBeenCalledWith(
        expect.objectContaining({ destinationZone: 'Campus Norte' }),
      ),
    );
  });

  it('filtra viajes localmente por texto de búsqueda', async () => {
    const trip1 = makeTrip({ id: 't1', originZone: 'Atocha', destinationZone: 'Bellavista' });
    const trip2 = makeTrip({
      id: 't2',
      originZone: 'Miraflores',
      destinationZone: 'Celiano',
      driver: { id: 'd2', fullName: 'Pedro Ramos', reputationScore: 4.0, career: null, vehicle: null },
    });
    mockGetTrips.mockResolvedValue({ data: { trips: [trip1, trip2], total: 2, page: 1, limit: 20 } });
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getByText('Atocha')).toBeTruthy());
    // Buscar por origen/destino del primer viaje: el segundo debe desaparecer
    fireEvent.changeText(screen.getByPlaceholderText('¿A dónde vas?'), 'Atocha');
    expect(screen.queryByText('Celiano')).toBeNull();
  });

  it('limpia búsqueda al presionar el ícono de cerrar', async () => {
    mockGetTrips.mockResolvedValue({ data: { trips: [makeTrip()], total: 1, page: 1, limit: 20 } });
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getByText('Buscar Viaje')).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText('¿A dónde vas?'), 'Texto');
    fireEvent.press(screen.getByTestId('icon-close-circle'));
    expect(screen.getByPlaceholderText('¿A dónde vas?').props.value ?? '').toBe('');
  });
});

describe('HomePasajeroScreen — estados del botón en tarjeta', () => {
  it('muestra Reservar cuando hay asientos disponibles', async () => {
    mockGetTrips.mockResolvedValue({ data: { trips: [makeTrip({ availableSeats: 3 })], total: 1, page: 1, limit: 20 } });
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getByText('Reservar')).toBeTruthy());
  });

  it('muestra Ver Detalles cuando queda 1 asiento', async () => {
    mockGetTrips.mockResolvedValue({ data: { trips: [makeTrip({ availableSeats: 1 })], total: 1, page: 1, limit: 20 } });
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getByText('Ver Detalles')).toBeTruthy());
  });

  it('muestra Reservado para solicitud aceptada', async () => {
    mockGetTrips.mockResolvedValue({ data: { trips: [makeTrip({ id: 'trip-ok' })], total: 1, page: 1, limit: 20 } });
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [{ tripId: 'trip-ok', status: 'ACCEPTED' }] },
    });
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getByText('Reservado')).toBeTruthy());
  });

  it('muestra Solicitud pendiente para solicitud en espera', async () => {
    mockGetTrips.mockResolvedValue({ data: { trips: [makeTrip({ id: 'trip-p' })], total: 1, page: 1, limit: 20 } });
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [{ tripId: 'trip-p', status: 'PENDING' }] },
    });
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getByText('Solicitud pendiente')).toBeTruthy());
  });

  it('excluye viajes propios del pasajero-conductor', async () => {
    const ownTrip = makeTrip({ driverId: 'passenger-1' });
    mockGetTrips.mockResolvedValue({ data: { trips: [ownTrip], total: 1, page: 1, limit: 20 } });
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() =>
      expect(screen.getByText('No hay viajes disponibles')).toBeTruthy(),
    );
  });

  it('navega a TripDetail al presionar Reservar', async () => {
    mockGetTrips.mockResolvedValue({ data: { trips: [makeTrip()], total: 1, page: 1, limit: 20 } });
    renderWithProviders(<HomePasajeroScreen />);
    await waitFor(() => expect(screen.getByText('Reservar')).toBeTruthy());
    fireEvent.press(screen.getByText('Reservar'));
    expect(mockNavigate).toHaveBeenCalledWith('TripDetail', { tripId: 'trip-1' });
  });
});

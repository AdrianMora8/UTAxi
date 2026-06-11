import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { requestsApi } from '../../api/requests.api';
import { usersApi } from '../../api/users.api';
import { paymentsApi } from '../../api/payments.api';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import ProfileScreen from '../../screens/app/ProfileScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../api/requests.api', () => ({
  requestsApi: { getMyRequests: jest.fn() },
}));

jest.mock('../../api/users.api', () => ({
  usersApi: { getMe: jest.fn() },
}));

jest.mock('../../api/payments.api', () => ({
  paymentsApi: { getWallet: jest.fn() },
}));

const mockNavigate = jest.fn();
const mockClearAuth = jest.fn();
const mockUseNavigation = useNavigation as jest.Mock;
const mockGetMyRequests = requestsApi.getMyRequests as jest.Mock;
const mockGetMe = usersApi.getMe as jest.Mock;
const mockGetWallet = paymentsApi.getWallet as jest.Mock;

const mockUser = {
  id: 'u1',
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

const mockProfile = {
  id: 'u1',
  email: 'ana@uta.edu.ec',
  fullName: 'Ana Torres',
  career: 'Ingeniería',
  phone: null,
  photoUrl: null,
  neighborhood: null,
  role: 'STUDENT' as const,
  status: 'ACTIVE',
  reputationScore: 4.9,
  totalTrips: 7,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  vehicle: null,
};

const makeCompletedRequest = (id: string) => ({
  id,
  tripId: `trip-${id}`,
  passengerId: 'u1',
  status: 'COMPLETED' as const,
  rejectionCount: 0,
  createdAt: new Date().toISOString(),
});

beforeEach(() => {
  jest.clearAllMocks();

  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
    goBack: jest.fn(),
    getParent: jest.fn().mockReturnValue({ navigate: jest.fn() }),
  });

  // ProfileScreen llama useAuthStore() sin selector — devuelve el estado completo
  (useAuthStore as jest.Mock).mockImplementation((selector?: (s: any) => any) => {
    const state = { user: mockUser, clearAuth: mockClearAuth, accessToken: 'tok' };
    return selector ? selector(state) : state;
  });

  mockGetMyRequests.mockResolvedValue({ data: { requests: [] } });
  mockGetMe.mockResolvedValue({ data: { user: mockProfile } });
  mockGetWallet.mockResolvedValue({ data: { walletBalance: 12.5, pendingBalance: 0, transactions: [] } });
});

describe('ProfileScreen — renderizado', () => {
  it('muestra el nombre completo del usuario', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeTruthy());
  });

  it('muestra la inicial del usuario en el avatar', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('A')).toBeTruthy());
  });

  it('muestra la carrera del usuario en mayúsculas', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('INGENIERÍA')).toBeTruthy());
  });

  it('muestra la puntuación de reputación del perfil', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('4.9')).toBeTruthy());
  });

  it('muestra el conteo de viajes completados como pasajero', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [
          makeCompletedRequest('r1'),
          makeCompletedRequest('r2'),
          { ...makeCompletedRequest('r3'), status: 'PENDING' }, // no debe contar
        ],
      },
    });
    renderWithProviders(<ProfileScreen />);
    // El stat PASAJERO muestra 2 (solo los COMPLETED)
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy());
  });

  it('muestra la stat CONDUCTOR si el perfil tiene vehículo', async () => {
    mockGetMe.mockResolvedValue({
      data: {
        user: {
          ...mockProfile,
          totalTrips: 5,
          vehicle: { id: 'v1', brand: 'Toyota', model: 'Corolla', year: 2020, plateNumber: 'ABC-1234', color: 'Blanco' },
        },
      },
    });
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('CONDUCTOR')).toBeTruthy());
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('oculta la stat CONDUCTOR si el perfil no tiene vehículo', async () => {
    mockGetMe.mockResolvedValue({ data: { user: { ...mockProfile, vehicle: null } } });
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeTruthy());
    expect(screen.queryByText('CONDUCTOR')).toBeNull();
  });

  it('muestra el saldo de U-Wallet en el ítem de menú', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Saldo: $12.50')).toBeTruthy());
  });

  it('muestra info del vehículo en el ítem Mi Vehículo', async () => {
    mockGetMe.mockResolvedValue({
      data: {
        user: {
          ...mockProfile,
          vehicle: { id: 'v1', brand: 'Honda', model: 'Civic', year: 2021, plateNumber: 'XYZ-5678', color: 'Negro' },
        },
      },
    });
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Honda Civic · XYZ-5678')).toBeTruthy());
  });
});

describe('ProfileScreen — acciones', () => {
  it('llama a clearAuth al presionar Cerrar Sesión', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Cerrar Sesión')).toBeTruthy());
    fireEvent.press(screen.getByText('Cerrar Sesión'));
    expect(mockClearAuth).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileScreen — navegación', () => {
  it('navega a EditProfile al presionar el ícono de editar', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeTruthy());
    fireEvent.press(screen.getByTestId('icon-pencil-outline'));
    expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
  });

  it('navega a Wallet al presionar U-Wallet', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('U-Wallet')).toBeTruthy());
    fireEvent.press(screen.getByText('U-Wallet'));
    expect(mockNavigate).toHaveBeenCalledWith('Wallet');
  });

  it('navega a MisViajes al presionar Historial', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Historial')).toBeTruthy());
    fireEvent.press(screen.getByText('Historial'));
    expect(mockNavigate).toHaveBeenCalledWith('MisViajes');
  });

  it('navega a Vehicle al presionar Mi Vehículo', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Mi Vehículo')).toBeTruthy());
    fireEvent.press(screen.getByText('Mi Vehículo'));
    expect(mockNavigate).toHaveBeenCalledWith('Vehicle');
  });
});

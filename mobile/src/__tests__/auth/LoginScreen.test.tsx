import React from 'react';
import { Alert } from 'react-native';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import LoginScreen from '../../screens/auth/LoginScreen';

jest.mock('../../api/auth.api', () => ({
  authApi: { login: jest.fn() },
}));

jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const mockSetAuth = jest.fn();
const nav = { navigate: jest.fn(), goBack: jest.fn() } as any;
const route = { params: undefined } as any;

const mockUser = {
  id: 'u1', email: 'student@uta.edu.ec', fullName: 'Ana',
  role: 'STUDENT', status: 'ACTIVE', emailVerified: true,
  reputationScore: 5, photoUrl: null, career: null, phone: null, neighborhood: null,
};

const mockLogin = authApi.login as jest.Mock;
const mockNavigate = nav.navigate as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  (useAuthStore as jest.Mock).mockImplementation(
    (selector: (s: { setAuth: jest.Mock }) => unknown) => selector({ setAuth: mockSetAuth })
  );
});

describe('LoginScreen — renderizado', () => {
  it('muestra el logo U-Ride', () => {
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);
    expect(screen.getByText('U-Ride')).toBeTruthy();
  });

  it('muestra el input de correo institucional', () => {
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);
    expect(screen.getByPlaceholderText('estudiante@uta.edu.ec')).toBeTruthy();
  });

  it('muestra el input de contraseña', () => {
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('muestra el botón Iniciar Sesión', () => {
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);
    expect(screen.getByText('Iniciar Sesión  →')).toBeTruthy();
  });

  it('muestra el link "Olvidé mi contraseña"', () => {
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);
    expect(screen.getByText('Olvidé mi contraseña')).toBeTruthy();
  });

  it('muestra el link "Registrarse"', () => {
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);
    expect(screen.getByText('Registrarse')).toBeTruthy();
  });
});

describe('LoginScreen — validación', () => {
  it('muestra Alert cuando los campos están vacíos', () => {
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('Iniciar Sesión  →'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Ingresa tu correo y contraseña');
  });

  it('no llama authApi.login cuando los campos están vacíos', () => {
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('Iniciar Sesión  →'));
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

describe('LoginScreen — submit exitoso', () => {
  it('llama authApi.login con email y password', async () => {
    mockLogin.mockResolvedValue({ data: { user: mockUser, accessToken: 'tok' } });
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);

    fireEvent.changeText(screen.getByPlaceholderText('estudiante@uta.edu.ec'), 'student@uta.edu.ec');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'Password1!');
    fireEvent.press(screen.getByText('Iniciar Sesión  →'));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({ email: 'student@uta.edu.ec', password: 'Password1!' })
    );
  });

  it('llama setAuth con user y token tras login exitoso', async () => {
    mockLogin.mockResolvedValue({ data: { user: mockUser, accessToken: 'tok-123' } });
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);

    fireEvent.changeText(screen.getByPlaceholderText('estudiante@uta.edu.ec'), 'student@uta.edu.ec');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'Password1!');
    fireEvent.press(screen.getByText('Iniciar Sesión  →'));

    await waitFor(() =>
      expect(mockSetAuth).toHaveBeenCalledWith(mockUser, 'tok-123')
    );
  });
});

describe('LoginScreen — error del servidor', () => {
  it('muestra Alert con mensaje del servidor al fallar', async () => {
    mockLogin.mockRejectedValue({ response: { data: { error: 'Credenciales incorrectas' } } });
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);

    fireEvent.changeText(screen.getByPlaceholderText('estudiante@uta.edu.ec'), 'x@uta.edu.ec');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'wrong');
    fireEvent.press(screen.getByText('Iniciar Sesión  →'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Credenciales incorrectas')
    );
  });

  it('muestra Alert genérico si el servidor no retorna error', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);

    fireEvent.changeText(screen.getByPlaceholderText('estudiante@uta.edu.ec'), 'x@uta.edu.ec');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'pass');
    fireEvent.press(screen.getByText('Iniciar Sesión  →'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Error al iniciar sesión')
    );
  });
});

describe('LoginScreen — navegación', () => {
  it('navega a ForgotPassword al presionar "Olvidé mi contraseña"', () => {
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('Olvidé mi contraseña'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('navega a Register al presionar "Registrarse"', () => {
    renderWithProviders(<LoginScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('Registrarse'));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });
});

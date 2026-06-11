import React from 'react';
import { Alert } from 'react-native';
import { authApi } from '../../api/auth.api';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import ForgotPasswordScreen from '../../screens/auth/ForgotPasswordScreen';

jest.mock('../../api/auth.api', () => ({
  authApi: {
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

const nav = { navigate: jest.fn(), goBack: jest.fn() } as any;
const route = { params: undefined } as any;

const mockForgotPassword = authApi.forgotPassword as jest.Mock;
const mockResetPassword = authApi.resetPassword as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
});

describe('ForgotPasswordScreen — Paso 1 (enviar código)', () => {
  it('muestra el título "Recuperar"', () => {
    renderWithProviders(<ForgotPasswordScreen navigation={nav} route={route} />);
    expect(screen.getByText(/Recuperar/i)).toBeTruthy();
  });

  it('muestra el input de correo institucional', () => {
    renderWithProviders(<ForgotPasswordScreen navigation={nav} route={route} />);
    expect(screen.getByPlaceholderText('estudiante@uta.edu.ec')).toBeTruthy();
  });

  it('muestra el botón "Enviar Código  →"', () => {
    renderWithProviders(<ForgotPasswordScreen navigation={nav} route={route} />);
    expect(screen.getByText('Enviar Código  →')).toBeTruthy();
  });

  it('muestra el link "Volver al inicio de sesión"', () => {
    renderWithProviders(<ForgotPasswordScreen navigation={nav} route={route} />);
    expect(screen.getByText('Volver al inicio de sesión')).toBeTruthy();
  });

  it('muestra Alert cuando el correo está vacío', () => {
    renderWithProviders(<ForgotPasswordScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('Enviar Código  →'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Ingresa tu correo institucional');
  });

  it('muestra Alert cuando el correo no es @uta.edu.ec', () => {
    renderWithProviders(<ForgotPasswordScreen navigation={nav} route={route} />);
    fireEvent.changeText(screen.getByPlaceholderText('estudiante@uta.edu.ec'), 'user@gmail.com');
    fireEvent.press(screen.getByText('Enviar Código  →'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Solo se permiten correos @uta.edu.ec');
  });

  it('llama authApi.forgotPassword con el email', async () => {
    mockForgotPassword.mockResolvedValue({});
    renderWithProviders(<ForgotPasswordScreen navigation={nav} route={route} />);
    fireEvent.changeText(screen.getByPlaceholderText('estudiante@uta.edu.ec'), 'user@uta.edu.ec');
    fireEvent.press(screen.getByText('Enviar Código  →'));

    await waitFor(() =>
      expect(mockForgotPassword).toHaveBeenCalledWith('user@uta.edu.ec')
    );
  });

  it('avanza al paso 2 tras enviar el código', async () => {
    mockForgotPassword.mockResolvedValue({});
    renderWithProviders(<ForgotPasswordScreen navigation={nav} route={route} />);
    fireEvent.changeText(screen.getByPlaceholderText('estudiante@uta.edu.ec'), 'user@uta.edu.ec');
    fireEvent.press(screen.getByText('Enviar Código  →'));

    await waitFor(() =>
      expect(screen.getByText('Ingresa el código')).toBeTruthy()
    );
  });

  it('muestra Alert de error del servidor al fallar', async () => {
    mockForgotPassword.mockRejectedValue({ response: { data: { error: 'Correo no encontrado' } } });
    renderWithProviders(<ForgotPasswordScreen navigation={nav} route={route} />);
    fireEvent.changeText(screen.getByPlaceholderText('estudiante@uta.edu.ec'), 'noexiste@uta.edu.ec');
    fireEvent.press(screen.getByText('Enviar Código  →'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Correo no encontrado')
    );
  });
});

describe('ForgotPasswordScreen — Paso 2 (restablecer contraseña)', () => {
  async function goToStep2() {
    mockForgotPassword.mockResolvedValue({});
    renderWithProviders(<ForgotPasswordScreen navigation={nav} route={route} />);
    fireEvent.changeText(screen.getByPlaceholderText('estudiante@uta.edu.ec'), 'user@uta.edu.ec');
    fireEvent.press(screen.getByText('Enviar Código  →'));
    await waitFor(() => expect(screen.getByText('Ingresa el código')).toBeTruthy());
  }

  it('muestra 6 cajas OTP en el paso 2', async () => {
    await goToStep2();
    const inputs = screen.UNSAFE_getAllByType('TextInput' as any);
    const otpInputs = inputs.filter((i: any) => i.props.maxLength === 1);
    expect(otpInputs.length).toBe(6);
  });

  it('muestra el input de nueva contraseña', async () => {
    await goToStep2();
    expect(screen.getByPlaceholderText('Nueva contraseña')).toBeTruthy();
  });

  it('muestra el input de confirmar contraseña', async () => {
    await goToStep2();
    expect(screen.getByPlaceholderText('Confirmar contraseña')).toBeTruthy();
  });

  it('muestra el botón "Restablecer Contraseña  →"', async () => {
    await goToStep2();
    expect(screen.getByText('Restablecer Contraseña  →')).toBeTruthy();
  });

  it('muestra Alert cuando el código está incompleto', async () => {
    await goToStep2();
    fireEvent.press(screen.getByText('Restablecer Contraseña  →'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Ingresa el código completo de 6 dígitos');
  });

  it('muestra Alert cuando las contraseñas no coinciden', async () => {
    await goToStep2();
    const inputs = screen.UNSAFE_getAllByType('TextInput' as any);
    const otpInputs = inputs.filter((i: any) => i.props.maxLength === 1);
    '123456'.split('').forEach((d, i) => fireEvent.changeText(otpInputs[i], d));
    fireEvent.changeText(screen.getByPlaceholderText('Nueva contraseña'), 'Password1!');
    fireEvent.changeText(screen.getByPlaceholderText('Confirmar contraseña'), 'OtraPass!');
    fireEvent.press(screen.getByText('Restablecer Contraseña  →'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Las contraseñas no coinciden');
  });

  it('llama authApi.resetPassword con email, código y nueva contraseña', async () => {
    mockResetPassword.mockResolvedValue({});
    await goToStep2();
    const inputs = screen.UNSAFE_getAllByType('TextInput' as any);
    const otpInputs = inputs.filter((i: any) => i.props.maxLength === 1);
    '123456'.split('').forEach((d, i) => fireEvent.changeText(otpInputs[i], d));
    fireEvent.changeText(screen.getByPlaceholderText('Nueva contraseña'), 'Password1!');
    fireEvent.changeText(screen.getByPlaceholderText('Confirmar contraseña'), 'Password1!');
    fireEvent.press(screen.getByText('Restablecer Contraseña  →'));

    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith('user@uta.edu.ec', '123456', 'Password1!')
    );
  });
});

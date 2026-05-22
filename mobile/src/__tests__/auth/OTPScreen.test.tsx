import React from 'react';
import { Alert } from 'react-native';
import { authApi } from '../../api/auth.api';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import OTPScreen from '../../screens/auth/OTPScreen';

jest.mock('../../api/auth.api', () => ({
  authApi: {
    verifyEmail: jest.fn(),
    resendCode: jest.fn(),
  },
}));

const nav = { navigate: jest.fn(), goBack: jest.fn() } as any;
const route = { params: { email: 'student@uta.edu.ec' } } as any;

const mockVerifyEmail = authApi.verifyEmail as jest.Mock;
const mockResendCode = authApi.resendCode as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
});

function fillOTP(code = '123456') {
  const inputs = screen.UNSAFE_getAllByType('TextInput' as any);
  const otpInputs = inputs.filter((i: any) => i.props.maxLength === 1);
  code.split('').forEach((digit, i) => {
    fireEvent.changeText(otpInputs[i], digit);
  });
}

describe('OTPScreen — renderizado', () => {
  it('muestra el título "Verifica tu correo"', () => {
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    expect(screen.getByText('Verifica tu correo')).toBeTruthy();
  });

  it('muestra el email del usuario en el subtítulo', () => {
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    expect(screen.getByText('student@uta.edu.ec')).toBeTruthy();
  });

  it('muestra 6 cajas de entrada OTP', () => {
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    const inputs = screen.UNSAFE_getAllByType('TextInput' as any);
    const otpInputs = inputs.filter((i: any) => i.props.maxLength === 1);
    expect(otpInputs.length).toBe(6);
  });

  it('muestra el botón "Verificar"', () => {
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    expect(screen.getByText('Verificar')).toBeTruthy();
  });

  it('muestra el link "Reenviar código"', () => {
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    expect(screen.getByText('Reenviar código')).toBeTruthy();
  });
});

describe('OTPScreen — validación', () => {
  it('muestra Alert cuando el código está incompleto', () => {
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('Verificar'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Ingresa el código completo de 6 dígitos');
  });

  it('no llama verifyEmail con código incompleto', () => {
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('Verificar'));
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });
});

describe('OTPScreen — verificación', () => {
  it('llama authApi.verifyEmail con email y código', async () => {
    mockVerifyEmail.mockResolvedValue({});
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    fillOTP('123456');
    fireEvent.press(screen.getByText('Verificar'));

    await waitFor(() =>
      expect(mockVerifyEmail).toHaveBeenCalledWith('student@uta.edu.ec', '123456')
    );
  });

  it('muestra Alert de éxito tras verificación correcta', async () => {
    mockVerifyEmail.mockResolvedValue({});
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    fillOTP('123456');
    fireEvent.press(screen.getByText('Verificar'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('¡Listo!', expect.stringContaining('verificado'), expect.any(Array))
    );
  });

  it('muestra Alert de error con código incorrecto', async () => {
    mockVerifyEmail.mockRejectedValue({ response: { data: { error: 'Código incorrecto' } } });
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    fillOTP('000000');
    fireEvent.press(screen.getByText('Verificar'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Código incorrecto')
    );
  });

  it('muestra Alert genérico si el servidor no retorna error', async () => {
    mockVerifyEmail.mockRejectedValue(new Error('Network'));
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    fillOTP('000000');
    fireEvent.press(screen.getByText('Verificar'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Código incorrecto o expirado')
    );
  });
});

describe('OTPScreen — reenviar código', () => {
  it('llama authApi.resendCode con el email al presionar Reenviar', async () => {
    mockResendCode.mockResolvedValue({});
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('Reenviar código'));

    await waitFor(() =>
      expect(mockResendCode).toHaveBeenCalledWith('student@uta.edu.ec')
    );
  });

  it('muestra Alert de confirmación tras reenviar', async () => {
    mockResendCode.mockResolvedValue({});
    renderWithProviders(<OTPScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('Reenviar código'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Código reenviado', expect.stringContaining('student@uta.edu.ec'))
    );
  });
});

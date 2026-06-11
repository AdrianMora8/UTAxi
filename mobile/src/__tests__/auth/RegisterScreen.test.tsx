import React from 'react';
import { Alert } from 'react-native';
import { authApi } from '../../api/auth.api';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import RegisterScreen from '../../screens/auth/RegisterScreen';

jest.mock('../../api/auth.api', () => ({
  authApi: { register: jest.fn() },
}));

const nav = { navigate: jest.fn(), goBack: jest.fn() } as any;
const route = { params: undefined } as any;

const mockRegister = authApi.register as jest.Mock;
const mockNavigate = nav.navigate as jest.Mock;
const mockGoBack = nav.goBack as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
});

function fillForm({
  name = 'Juan Pérez',
  email = 'juan@uta.edu.ec',
  password = 'Password1!',
  confirm = 'Password1!',
  acceptTerms = true,
} = {}) {
  fireEvent.changeText(screen.getByPlaceholderText('Ej. Juan Pérez'), name);
  fireEvent.changeText(screen.getByPlaceholderText('usuario@uta.edu.ec'), email);
  const passwords = screen.getAllByPlaceholderText('••••••••');
  fireEvent.changeText(passwords[0], password);
  fireEvent.changeText(passwords[1], confirm);
  if (acceptTerms) {
    fireEvent.press(screen.getByText(/Acepto los/i));
  }
}

describe('RegisterScreen — renderizado', () => {
  it('muestra el título "Únete a la vía."', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    expect(screen.getByText('Únete a la vía.')).toBeTruthy();
  });

  it('muestra el input de nombre completo', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    expect(screen.getByPlaceholderText('Ej. Juan Pérez')).toBeTruthy();
  });

  it('muestra el input de correo institucional', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    expect(screen.getByPlaceholderText('usuario@uta.edu.ec')).toBeTruthy();
  });

  it('muestra dos inputs de contraseña', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    expect(screen.getAllByPlaceholderText('••••••••').length).toBe(2);
  });

  it('muestra el botón "Crear Cuenta  →"', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    expect(screen.getByText('Crear Cuenta  →')).toBeTruthy();
  });

  it('muestra el selector de carrera', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    expect(screen.getByText('Selecciona tu carrera')).toBeTruthy();
  });

  it('muestra el checkbox de términos', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    expect(screen.getByText(/Acepto los/i)).toBeTruthy();
  });
});

describe('RegisterScreen — validaciones', () => {
  it('muestra Alert cuando los campos están vacíos', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('Crear Cuenta  →'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Completa todos los campos requeridos');
  });

  it('muestra Alert cuando el correo no es @uta.edu.ec', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    fillForm({ email: 'juan@gmail.com' });
    fireEvent.press(screen.getByText('Crear Cuenta  →'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Solo se permiten correos @uta.edu.ec');
  });

  it('muestra Alert cuando la contraseña tiene menos de 8 caracteres', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    fillForm({ password: 'short', confirm: 'short' });
    fireEvent.press(screen.getByText('Crear Cuenta  →'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'La contraseña debe tener al menos 8 caracteres');
  });

  it('muestra Alert cuando las contraseñas no coinciden', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    fillForm({ password: 'Password1!', confirm: 'OtraPass1!' });
    fireEvent.press(screen.getByText('Crear Cuenta  →'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Las contraseñas no coinciden');
  });

  it('muestra Alert cuando no se aceptan los términos', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    fillForm({ acceptTerms: false });
    fireEvent.press(screen.getByText('Crear Cuenta  →'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Debes aceptar los términos y condiciones');
  });
});

describe('RegisterScreen — submit exitoso', () => {
  it('llama authApi.register con los datos correctos', async () => {
    mockRegister.mockResolvedValue({});
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    fillForm();
    fireEvent.press(screen.getByText('Crear Cuenta  →'));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'juan@uta.edu.ec',
        password: 'Password1!',
        fullName: 'Juan Pérez',
        career: undefined,
      })
    );
  });

  it('navega a OTP con el email tras registro exitoso', async () => {
    mockRegister.mockResolvedValue({});
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    fillForm();
    fireEvent.press(screen.getByText('Crear Cuenta  →'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('OTP', { email: 'juan@uta.edu.ec' })
    );
  });

  it('muestra Alert de error del servidor al fallar', async () => {
    mockRegister.mockRejectedValue({ response: { data: { error: 'Correo ya registrado' } } });
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    fillForm();
    fireEvent.press(screen.getByText('Crear Cuenta  →'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Correo ya registrado')
    );
  });
});

describe('RegisterScreen — navegación', () => {
  it('vuelve atrás al presionar el botón back', () => {
    renderWithProviders(<RegisterScreen navigation={nav} route={route} />);
    fireEvent.press(screen.getByText('¿Ya tienes cuenta?', { exact: false }));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

import React from 'react';
import { Alert } from 'react-native';
import { paymentsApi } from '../../api/payments.api';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import WalletScreen from '../../screens/app/WalletScreen';

jest.mock('../../api/payments.api', () => ({
  paymentsApi: {
    getWallet: jest.fn(),
    topUp: jest.fn(),
  },
}));

const mockGetWallet = paymentsApi.getWallet as jest.Mock;
const mockTopUp = paymentsApi.topUp as jest.Mock;

const nav = { navigate: jest.fn(), goBack: jest.fn() } as any;
const route = {} as any;

const makeWalletData = (overrides: Record<string, unknown> = {}) => ({
  walletBalance: 25.5,
  pendingBalance: 0,
  transactions: [],
  ...overrides,
});

const makeTx = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1',
  userId: 'u1',
  amount: 10.0,
  type: 'CREDIT',
  concept: 'TOPUP',
  description: 'Recarga manual',
  createdAt: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
});

describe('WalletScreen — renderizado', () => {
  it('no muestra contenido mientras carga', () => {
    mockGetWallet.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    expect(screen.queryByText('Saldo disponible')).toBeNull();
  });

  it('muestra estado de error con botón reintentar', async () => {
    mockGetWallet.mockRejectedValue(new Error('Network Error'));
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Error de conexión')).toBeTruthy());
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });

  it('muestra el saldo disponible formateado', async () => {
    mockGetWallet.mockResolvedValue({ data: makeWalletData({ walletBalance: 25.5 }) });
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('$25.50')).toBeTruthy());
    expect(screen.getByText('Saldo disponible')).toBeTruthy();
  });

  it('muestra saldo pendiente si pendingBalance > 0', async () => {
    mockGetWallet.mockResolvedValue({
      data: makeWalletData({ walletBalance: 20.0, pendingBalance: 5.0 }),
    });
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('$5.00 en tránsito')).toBeTruthy());
  });

  it('muestra estado vacío si no hay transacciones', async () => {
    mockGetWallet.mockResolvedValue({ data: makeWalletData({ transactions: [] }) });
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Sin movimientos aún')).toBeTruthy());
  });

  it('muestra fila de transacción con monto y concepto', async () => {
    mockGetWallet.mockResolvedValue({
      data: makeWalletData({ transactions: [makeTx()] }),
    });
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Recarga')).toBeTruthy());
    expect(screen.getByText('+$10.00')).toBeTruthy();
  });

  it('muestra descripción de la transacción', async () => {
    mockGetWallet.mockResolvedValue({
      data: makeWalletData({ transactions: [makeTx({ description: 'Recarga manual' })] }),
    });
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Recarga manual')).toBeTruthy());
  });

  it('muestra monto en rojo para transacciones de débito', async () => {
    mockGetWallet.mockResolvedValue({
      data: makeWalletData({
        transactions: [makeTx({ id: 'tx-2', type: 'DEBIT', concept: 'PAYMENT', amount: 3.0 })],
      }),
    });
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('-$3.00')).toBeTruthy());
  });
});

describe('WalletScreen — modal de recarga', () => {
  beforeEach(async () => {
    mockGetWallet.mockResolvedValue({ data: makeWalletData() });
  });

  it('abre el modal al presionar Recargar', async () => {
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Recargar')).toBeTruthy());
    fireEvent.press(screen.getByText('Recargar'));
    await waitFor(() => expect(screen.getByText('Recargar U-Wallet')).toBeTruthy());
  });

  it('cierra el modal al presionar Cancelar', async () => {
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Recargar')).toBeTruthy());
    fireEvent.press(screen.getByText('Recargar'));
    await waitFor(() => expect(screen.getByText('Cancelar')).toBeTruthy());
    fireEvent.press(screen.getByText('Cancelar'));
    await waitFor(() => expect(screen.queryByText('Recargar U-Wallet')).toBeNull());
  });

  it('muestra Alert cuando el monto es inválido (0 o texto)', async () => {
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Recargar')).toBeTruthy());
    fireEvent.press(screen.getByText('Recargar'));
    await waitFor(() => expect(screen.getByText('Recargar U-Wallet')).toBeTruthy());
    // No ingresamos monto (queda vacío → NaN)
    const confirmBtns = screen.getAllByText('Recargar');
    // El último "Recargar" es el botón del modal
    fireEvent.press(confirmBtns[confirmBtns.length - 1]);
    expect(Alert.alert).toHaveBeenCalledWith('Monto inválido', expect.any(String));
  });

  it('muestra Alert cuando el monto supera $500', async () => {
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Recargar')).toBeTruthy());
    fireEvent.press(screen.getByText('Recargar'));
    await waitFor(() => expect(screen.getByText('Recargar U-Wallet')).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '600');
    const confirmBtns = screen.getAllByText('Recargar');
    fireEvent.press(confirmBtns[confirmBtns.length - 1]);
    expect(Alert.alert).toHaveBeenCalledWith('Monto inválido', expect.any(String));
  });

  it('llama a topUp y muestra Alert de éxito con el nuevo saldo', async () => {
    mockTopUp.mockResolvedValue({ data: { walletBalance: 35.5 } });
    renderWithProviders(<WalletScreen navigation={nav} route={route} />);
    await waitFor(() => expect(screen.getByText('Recargar')).toBeTruthy());
    fireEvent.press(screen.getByText('Recargar'));
    await waitFor(() => expect(screen.getByText('Recargar U-Wallet')).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '10');
    const confirmBtns = screen.getAllByText('Recargar');
    fireEvent.press(confirmBtns[confirmBtns.length - 1]);
    await waitFor(() => expect(mockTopUp).toHaveBeenCalledWith(10));
    expect(Alert.alert).toHaveBeenCalledWith('Recarga exitosa', expect.stringContaining('35.50'));
  });
});

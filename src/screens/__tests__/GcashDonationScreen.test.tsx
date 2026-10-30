import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { GcashDonationScreen } from '../GcashDonationScreen';
import { theme } from '../../theme';

// Navigation spies (the `mock` prefix is required for jest.mock hoisting).
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

// The local native module: controllable resolve/reject.
const mockSave = jest.fn();
jest.mock('gcash-image', () => ({
  saveImageToGallery: () => mockSave(),
}));

function renderScreen() {
  return render(
    <PaperProvider theme={theme}>
      <GcashDonationScreen />
    </PaperProvider>
  );
}

describe('GcashDonationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue('GCash-InstaPay-QR.png');
  });

  it('renders the header, the QR image, and the download button', async () => {
    await renderScreen();
    expect(screen.getByText('GCash')).toBeTruthy();
    expect(screen.getByTestId('gcash-qr-image')).toBeTruthy();
    expect(screen.getByText('Download QR to phone')).toBeTruthy();
    expect(screen.getByText(/saves the qr image to your phone’s gallery/i)).toBeTruthy();
  });

  it('shows the saved snackbar when the native save succeeds', async () => {
    await renderScreen();
    expect(screen.queryByTestId('qr-saved-snackbar')).toBeNull();

    await fireEvent.press(screen.getByTestId('download-qr'));
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('qr-saved-snackbar')).toBeTruthy();
    expect(screen.getByText('QR saved to gallery')).toBeTruthy();
  });

  it('shows the error snackbar when the native save fails', async () => {
    mockSave.mockRejectedValue(new Error('nope'));
    await renderScreen();

    await fireEvent.press(screen.getByTestId('download-qr'));
    expect(screen.getByTestId('qr-save-error-snackbar')).toBeTruthy();
    expect(screen.getByText('Could not save the QR image')).toBeTruthy();
    expect(screen.queryByTestId('qr-saved-snackbar')).toBeNull();
  });

  it('goes back when the back button is pressed', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('gcash-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

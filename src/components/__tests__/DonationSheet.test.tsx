import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { DonationSheet } from '../DonationSheet';
import { theme } from '../../theme';

// RNTL 14: render() returns a thenable — await it before asserting on `screen`.
async function renderSheet(onKofi = jest.fn(), onGcash = jest.fn()) {
  const r = render(
    <PaperProvider theme={theme}>
      <DonationSheet onKofi={onKofi} onGcash={onGcash} />
    </PaperProvider>
  );
  await r;
  return { onKofi, onGcash };
}

describe('DonationSheet', () => {
  it('renders the title and both option rows', async () => {
    await renderSheet();
    expect(screen.getByTestId('donation-sheet')).toBeTruthy();
    expect(screen.getByText('Support development')).toBeTruthy();
    expect(screen.getByText('Pick a way to send support.')).toBeTruthy();
    expect(screen.getByText('Ko-fi')).toBeTruthy();
    expect(screen.getByText('GCash')).toBeTruthy();
  });

  it('calls onKofi when the Ko-fi row is pressed', async () => {
    const { onKofi } = await renderSheet();
    await fireEvent.press(screen.getByTestId('donation-kofi'));
    expect(onKofi).toHaveBeenCalledTimes(1);
  });

  it('calls onGcash when the GCash row is pressed', async () => {
    const { onGcash } = await renderSheet();
    await fireEvent.press(screen.getByTestId('donation-gcash'));
    expect(onGcash).toHaveBeenCalledTimes(1);
  });
});

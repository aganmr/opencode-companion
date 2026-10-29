import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SessionCard } from '../SessionCard';

// RNTL 14: render() is async (promise-based test-renderer root) — always await it,
// otherwise the module-level `screen` is not bound when the assertion runs.
const base = {
  url: 'http://example.com/tunnel',
  time: 'now',
  expiryLabel: 'expires in 29 days',
  expiryColor: '#a3a7ad',
  onPress: jest.fn(),
  onLongPress: jest.fn(),
  onCopy: jest.fn(),
  onDelete: jest.fn(),
};

describe('SessionCard expiry label', () => {
  it('shows the time-ago and expiry label on the time line', async () => {
    await render(<SessionCard {...base} isDeleting={false} />);
    // The time line is a nested Text: the outer node's text is the
    // concatenation ("now · expires in 29 days"), so match by regex.
    expect(screen.getByText(/now/)).toBeTruthy();
    expect(screen.getByText(' · expires in 29 days')).toBeTruthy();
  });

  it('renders the label with the given color', async () => {
    await render(<SessionCard {...base} expiryColor="#e3b341" isDeleting={false} />);
    const label = screen.getByText(' · expires in 29 days');
    expect(label.props.style).toEqual({ color: '#e3b341' });
  });
});

describe('SessionCard', () => {
  it('shows the chevron (not actions) when not active', async () => {
    await render(<SessionCard {...base} isDeleting={false} />);
    expect(screen.queryByTestId('session-copy')).toBeNull();
    expect(screen.queryByTestId('session-delete')).toBeNull();
  });

  it('shows copy + delete in place of the chevron when active', async () => {
    await render(<SessionCard {...base} isDeleting={true} />);
    expect(screen.getByTestId('session-copy')).toBeTruthy();
    expect(screen.getByTestId('session-delete')).toBeTruthy();
  });

  it('calls onLongPress when the card is long-pressed', async () => {
    await render(<SessionCard {...base} isDeleting={false} />);
    await fireEvent(screen.getByTestId('session-card'), 'longPress');
    expect(base.onLongPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPress when tapped (navigate) while not active', async () => {
    await render(<SessionCard {...base} isDeleting={false} />);
    await fireEvent.press(screen.getByTestId('session-card'));
    expect(base.onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onCopy when the copy button is pressed', async () => {
    await render(<SessionCard {...base} isDeleting={true} />);
    await fireEvent.press(screen.getByTestId('session-copy'));
    expect(base.onCopy).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the delete button is pressed', async () => {
    await render(<SessionCard {...base} isDeleting={true} />);
    await fireEvent.press(screen.getByTestId('session-delete'));
    expect(base.onDelete).toHaveBeenCalledTimes(1);
  });
});

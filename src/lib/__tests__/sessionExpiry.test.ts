import {
  EXPIRY_SOON_DAYS,
  SESSION_TTL_DAYS,
  sessionExpiry,
  sessionExpiryLabel,
} from '../sessionExpiry';

const DAY = 86_400_000;
const now = Date.parse('2026-10-29T12:00:00Z');

describe('sessionExpiry', () => {
  it('a fresh session has the full TTL left and is "ok"', () => {
    expect(sessionExpiry(now, now)).toEqual({
      daysLeft: SESSION_TTL_DAYS,
      state: 'ok',
    });
  });

  it('counts down day by day, rounding up partial days', () => {
    // 29 days after connecting: exactly 1 day left.
    expect(sessionExpiry(now - 29 * DAY, now)).toEqual({ daysLeft: 1, state: 'soon' });
    // A few hours past that: still 1 day left (ceil of the fraction).
    expect(sessionExpiry(now - (29 * DAY + 3_600_000), now).daysLeft).toBe(1);
  });

  it('turns "soon" at the amber boundary and "ok" above it', () => {
    expect(sessionExpiry(now - (SESSION_TTL_DAYS - EXPIRY_SOON_DAYS - 1) * DAY, now)).toEqual({
      daysLeft: EXPIRY_SOON_DAYS + 1,
      state: 'ok',
    });
    expect(sessionExpiry(now - (SESSION_TTL_DAYS - EXPIRY_SOON_DAYS) * DAY, now)).toEqual({
      daysLeft: EXPIRY_SOON_DAYS,
      state: 'soon',
    });
  });

  it('is "expired" at and past the 30-day mark (daysLeft clamped to 0)', () => {
    expect(sessionExpiry(now - SESSION_TTL_DAYS * DAY, now)).toEqual({
      daysLeft: 0,
      state: 'expired',
    });
    expect(sessionExpiry(now - (SESSION_TTL_DAYS + 5) * DAY, now)).toEqual({
      daysLeft: 0,
      state: 'expired',
    });
  });
});

describe('sessionExpiryLabel', () => {
  it('fresh: "expires in 30 days"', () => {
    expect(sessionExpiryLabel(sessionExpiry(now, now))).toBe('expires in 30 days');
  });

  it('middle: "expires in N days"', () => {
    expect(sessionExpiryLabel({ daysLeft: 12, state: 'ok' })).toBe('expires in 12 days');
  });

  it('singular: "expires tomorrow"', () => {
    expect(sessionExpiryLabel({ daysLeft: 1, state: 'soon' })).toBe('expires tomorrow');
  });

  it('expired: "expired — scan QR again"', () => {
    expect(sessionExpiryLabel({ daysLeft: 0, state: 'expired' })).toBe(
      'expired — scan QR again'
    );
  });
});

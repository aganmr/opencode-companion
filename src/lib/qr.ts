export type QrParseResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/**
 * Parses an opencode remote QR payload of the form:
 *   {"code":"s9s9wM2huprc0xTsCc6icw","urls":["https://host.tunnel.xyz"]}
 * and builds the connect URL: <urls[0]> + "/auth/connect/" + <code>
 */
export function parseOpencodeQr(raw: string): QrParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'QR code is not valid JSON' };
  }

  if (typeof data !== 'object' || data === null) {
    return { ok: false, reason: 'QR code has an unexpected format' };
  }

  const record = data as { code?: unknown; urls?: unknown };

  if (typeof record.code !== 'string' || record.code.length === 0) {
    return { ok: false, reason: 'QR code is missing a "code" field' };
  }

  if (
    !Array.isArray(record.urls) ||
    record.urls.length === 0 ||
    typeof record.urls[0] !== 'string'
  ) {
    return { ok: false, reason: 'QR code is missing a "urls" field' };
  }

  const base = (record.urls[0] as string).replace(/\/+$/, '');
  return { ok: true, url: `${base}/auth/connect/${record.code}` };
}

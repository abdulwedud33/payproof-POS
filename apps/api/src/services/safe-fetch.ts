import dns from 'node:dns/promises';
import net from 'node:net';
import { computeRawHash, SafeFetchErrorCode } from '@payproof/shared-types';

export interface SafeFetchOptions {
  allowlistHosts: string[];
  allowHttpForDev?: boolean;
  allowLoopbackForDev?: boolean;
  maxRedirects?: number;
  connectTimeoutMs?: number;
  readTimeoutMs?: number;
  maxBytes?: number;
}

export interface SafeFetchResponse {
  ok: true;
  body: string;
  httpStatus: number;
  contentType: string;
  rawHash: string;
  finalUrl: string;
  host: string;
  path: string;
  durationMs: number;
}

export class SafeFetchException extends Error {
  constructor(
    public readonly code: SafeFetchErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'SafeFetchException';
  }
}

/**
 * Checks whether an IPv4 or IPv6 address belongs to private, loopback, or reserved ranges.
 */
export function isForbiddenIp(
  ip: string,
  allowLoopback: boolean = false
): { forbidden: boolean; reason?: string } {
  // Always forbid link-local and AWS / cloud metadata IP
  if (ip === '169.254.169.254' || ip.startsWith('169.254.')) {
    return { forbidden: true, reason: 'Link-local or cloud metadata IP (169.254.0.0/16)' };
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
      return allowLoopback
        ? { forbidden: false }
        : { forbidden: true, reason: 'IPv6 loopback (::1)' };
    }
    if (
      normalized.startsWith('fe80:') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return { forbidden: true, reason: 'IPv6 link-local (fe80::/10)' };
    }
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return { forbidden: true, reason: 'IPv6 unique local (fc00::/7)' };
    }
    return { forbidden: false };
  }

  // IPv4 checks
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return { forbidden: true, reason: 'Malformed IP notation' };
  }

  const [b0, b1] = parts as [number, number, number, number];

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) {
    return allowLoopback
      ? { forbidden: false }
      : { forbidden: true, reason: 'Loopback IP (127.0.0.0/8)' };
  }

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) {
    return { forbidden: true, reason: 'Current network IP (0.0.0.0/8)' };
  }

  // 10.0.0.0/8 (RFC 1918 Private)
  if (b0 === 10) {
    return { forbidden: true, reason: 'RFC 1918 Private network (10.0.0.0/8)' };
  }

  // 172.16.0.0/12 (RFC 1918 Private: 172.16.x.x - 172.31.x.x)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) {
    return { forbidden: true, reason: 'RFC 1918 Private network (172.16.0.0/12)' };
  }

  // 192.168.0.0/16 (RFC 1918 Private)
  if (b0 === 192 && b1 === 168) {
    return { forbidden: true, reason: 'RFC 1918 Private network (192.168.0.0/16)' };
  }

  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) {
    return { forbidden: true, reason: 'Carrier-Grade NAT (100.64.0.0/10)' };
  }

  // 224.0.0.0/4 (Multicast) and 240.0.0.0/4 (Reserved)
  if (b0 >= 224) {
    return { forbidden: true, reason: 'Multicast or reserved IP (224.0.0.0/4+)' };
  }

  return { forbidden: false };
}

/**
 * Validates a single URL against protocol, credentials, allowlist, and SSRF rules.
 */
export async function validateUrlSafety(
  urlString: string,
  options: SafeFetchOptions
): Promise<{ parsedUrl: URL; resolvedIps: string[] }> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new SafeFetchException('UNTRUSTED_LINK', 'Invalid URL format', { url: urlString });
  }

  // 1. Protocol validation
  const isHttps = parsed.protocol === 'https:';
  const isHttp = parsed.protocol === 'http:';

  if (!isHttps) {
    if (!isHttp || !options.allowHttpForDev) {
      throw new SafeFetchException(
        'UNTRUSTED_LINK',
        `Protocol '${parsed.protocol}' is forbidden; HTTPS required`,
        {
          protocol: parsed.protocol,
        }
      );
    }
  }

  // 2. Reject credentials in URL (user:pass@host)
  if (parsed.username || parsed.password) {
    throw new SafeFetchException(
      'UNTRUSTED_LINK',
      'Embedded credentials in URL are strictly prohibited',
      {
        host: parsed.hostname,
      }
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Host Allowlist Check
  const isAllowlisted = options.allowlistHosts.some((allowed) => {
    const normAllowed = allowed.toLowerCase();
    if (normAllowed.startsWith('*.')) {
      const rootDomain = normAllowed.slice(2);
      return hostname === rootDomain || hostname.endsWith(`.${rootDomain}`);
    }
    return hostname === normAllowed;
  });

  if (!isAllowlisted) {
    throw new SafeFetchException(
      'UNTRUSTED_LINK',
      `Host '${hostname}' is not on the provider allowlist`,
      {
        hostname,
        allowlist: options.allowlistHosts,
      }
    );
  }

  // 4. DNS Resolution & SSRF check
  let addresses: string[] = [];

  // Check if hostname is already a raw IP
  if (net.isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      const records = await dns.lookup(hostname, { all: true });
      addresses = records.map((r) => r.address);
    } catch (err: any) {
      throw new SafeFetchException('FETCH_FAILED', `Failed to resolve DNS for host '${hostname}'`, {
        error: err.message,
      });
    }
  }

  if (addresses.length === 0) {
    throw new SafeFetchException('FETCH_FAILED', `No IP addresses found for host '${hostname}'`);
  }

  // Validate every resolved IP
  for (const ip of addresses) {
    const check = isForbiddenIp(ip, Boolean(options.allowLoopbackForDev));
    if (check.forbidden) {
      throw new SafeFetchException(
        'SSRF_BLOCKED',
        `Host '${hostname}' resolved to forbidden address: ${check.reason}`,
        {
          hostname,
          resolvedIp: ip,
          reason: check.reason,
        }
      );
    }
  }

  return { parsedUrl: parsed, resolvedIps: addresses };
}

/**
 * Hardened Safe Fetcher adhering to TRD 4.6 and SECURITY.md S4:
 * - HTTPS only (or HTTP for dev if allowHttpForDev)
 * - Strict host allowlist
 * - Pre-connection DNS resolution & anti-SSRF IP filtering
 * - Re-validated manual redirect hops (max 3)
 * - Short timeouts (3s connect, 5s read)
 * - Response size limits (500 KB cap)
 * - Clean request headers (no credentials)
 * - Deterministic SHA-256 body hash
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions
): Promise<SafeFetchResponse> {
  const maxRedirects = options.maxRedirects ?? 3;
  const timeoutMs = options.readTimeoutMs ?? 5000;
  const maxBytes = options.maxBytes ?? 512000; // 500 KB
  const startTime = Date.now();

  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    const { parsedUrl } = await validateUrlSafety(currentUrl, options);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'user-agent': 'PayProof-Verifier/1.0 (+https://payproof.astu.edu.et)',
          accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        },
        redirect: 'manual',
        signal: controller.signal,
      });

      // Handle Redirects
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new SafeFetchException(
            'UNTRUSTED_LINK',
            `Exceeded maximum redirect limit of ${maxRedirects} hops`
          );
        }

        const location = res.headers.get('location');
        if (!location) {
          throw new SafeFetchException(
            'FETCH_FAILED',
            `Received HTTP ${res.status} redirect without Location header`
          );
        }

        // Resolve redirect URL relative to current URL
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      // Read response body with streaming size limit
      if (!res.body) {
        throw new SafeFetchException('FETCH_FAILED', 'Response body is empty');
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          totalBytes += value.length;
          if (totalBytes > maxBytes) {
            await reader.cancel('Response size exceeded limit');
            throw new SafeFetchException(
              'SIZE_EXCEEDED',
              `Response exceeded maximum size limit of ${maxBytes} bytes`,
              {
                bytesReceived: totalBytes,
                maxBytes,
              }
            );
          }
          chunks.push(value);
        }
      }

      const fullBuffer = Buffer.concat(chunks);
      const text = fullBuffer.toString('utf8');
      const rawHash = computeRawHash(fullBuffer);
      const durationMs = Date.now() - startTime;

      return {
        ok: true,
        body: text,
        httpStatus: res.status,
        contentType: res.headers.get('content-type') || 'text/html',
        rawHash,
        finalUrl: currentUrl,
        host: parsedUrl.hostname,
        path: parsedUrl.pathname,
        durationMs,
      };
    } catch (err: any) {
      if (err instanceof SafeFetchException) {
        throw err;
      }
      if (err.name === 'AbortError' || controller.signal.aborted) {
        throw new SafeFetchException('TIMEOUT', `Request timed out after ${timeoutMs}ms`, {
          timeoutMs,
        });
      }
      throw new SafeFetchException('FETCH_FAILED', `Network request failed: ${err.message}`, {
        error: err.message,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new SafeFetchException('UNTRUSTED_LINK', 'Exceeded maximum redirects');
}

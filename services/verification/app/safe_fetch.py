import hashlib
import ipaddress
import socket
import time
from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urlparse, urljoin
import httpx

from app.schemas import SafeFetchErrorCode


class SafeFetchException(Exception):
    def __init__(self, code: SafeFetchErrorCode, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def is_forbidden_ip(ip_str: str, allow_loopback: bool = False) -> Tuple[bool, Optional[str]]:
    # Link-local or cloud metadata is ALWAYS forbidden
    if ip_str == "169.254.169.254" or ip_str.startswith("169.254."):
        return True, "Link-local or cloud metadata IP (169.254.0.0/16)"

    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True, "Malformed IP representation"

    if ip.is_loopback:
        if allow_loopback:
            return False, None
        return True, f"Loopback address ({ip_str})"

    CARRIER_GRADE_NAT = ipaddress.ip_network("100.64.0.0/10")
    if ip in CARRIER_GRADE_NAT:
        return True, f"Carrier-Grade NAT address ({ip_str})"

    if ip.is_private:
        return True, f"Private RFC 1918 address ({ip_str})"

    if ip.is_link_local:
        return True, f"Link-local address ({ip_str})"

    if ip.is_multicast or ip.is_reserved:
        return True, f"Multicast or reserved address ({ip_str})"

    return False, None


def validate_url_safety(
    url_str: str,
    allowlist_hosts: List[str],
    allow_http_for_dev: bool = False,
    allow_loopback_for_dev: bool = False,
) -> Tuple[str, str, List[str]]:
    try:
        parsed = urlparse(url_str)
    except Exception as e:
        raise SafeFetchException(SafeFetchErrorCode.UNTRUSTED_LINK, "Invalid URL format", {"url": url_str})

    if not parsed.scheme or not parsed.hostname:
        raise SafeFetchException(SafeFetchErrorCode.UNTRUSTED_LINK, "Missing URL scheme or hostname", {"url": url_str})

    # 1. Scheme Validation
    if parsed.scheme.lower() != "https":
        if parsed.scheme.lower() != "http" or not allow_http_for_dev:
            raise SafeFetchException(
                SafeFetchErrorCode.UNTRUSTED_LINK,
                f"Protocol '{parsed.scheme}' is forbidden; HTTPS required",
                {"scheme": parsed.scheme},
            )

    # 2. Reject credentials in URL
    if parsed.username or parsed.password:
        raise SafeFetchException(
            SafeFetchErrorCode.UNTRUSTED_LINK,
            "Embedded credentials in URL are strictly prohibited",
            {"hostname": parsed.hostname},
        )

    hostname = parsed.hostname.lower()

    # 3. Host Allowlist Check
    is_allowed = False
    for allowed in allowlist_hosts:
        norm_allowed = allowed.lower()
        if norm_allowed.startswith("*."):
            root_domain = norm_allowed[2:]
            if hostname == root_domain or hostname.endswith(f".{root_domain}"):
                is_allowed = True
                break
        elif hostname == norm_allowed:
            is_allowed = True
            break

    if not is_allowed:
        raise SafeFetchException(
            SafeFetchErrorCode.UNTRUSTED_LINK,
            f"Host '{hostname}' is not on the provider allowlist",
            {"hostname": hostname, "allowlist": allowlist_hosts},
        )

    # 4. DNS Resolution & SSRF Filtering
    try:
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        resolved_ips = list({info[4][0] for info in addr_info})
    except socket.gaierror as e:
        raise SafeFetchException(
            SafeFetchErrorCode.FETCH_FAILED,
            f"Failed to resolve DNS for host '{hostname}': {e}",
            {"hostname": hostname},
        )

    if not resolved_ips:
        raise SafeFetchException(
            SafeFetchErrorCode.FETCH_FAILED,
            f"No IP addresses found for host '{hostname}'",
            {"hostname": hostname},
        )

    for ip_str in resolved_ips:
        forbidden, reason = is_forbidden_ip(ip_str, allow_loopback=allow_loopback_for_dev)
        if forbidden:
            raise SafeFetchException(
                SafeFetchErrorCode.SSRF_BLOCKED,
                f"Host '{hostname}' resolved to forbidden address: {reason}",
                {"hostname": hostname, "ip": ip_str, "reason": reason},
            )

    return hostname, parsed.path or "/", resolved_ips


async def safe_fetch_page(
    url: str,
    allowlist_hosts: List[str],
    allow_http_for_dev: bool = False,
    allow_loopback_for_dev: bool = False,
    max_redirects: int = 3,
    connect_timeout: float = 3.0,
    read_timeout: float = 5.0,
    max_bytes: int = 512_000,
) -> Dict[str, Any]:
    start_time = time.time()
    current_url = url
    redirect_count = 0

    timeout = httpx.Timeout(read_timeout, connect=connect_timeout)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        while redirect_count <= max_redirects:
            hostname, path, _ = validate_url_safety(
                current_url,
                allowlist_hosts=allowlist_hosts,
                allow_http_for_dev=allow_http_for_dev,
                allow_loopback_for_dev=allow_loopback_for_dev,
            )

            try:
                response = await client.get(
                    current_url,
                    headers={
                        "User-Agent": "PayProof-Verifier/1.0 (+https://payproof.astu.edu.et)",
                        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
                    },
                )

                # Redirect handling
                if response.status_code in (301, 302, 303, 307, 308):
                    redirect_count += 1
                    if redirect_count > max_redirects:
                        raise SafeFetchException(
                            SafeFetchErrorCode.UNTRUSTED_LINK,
                            f"Exceeded maximum redirect limit of {max_redirects} hops",
                        )

                    location = response.headers.get("location")
                    if not location:
                        raise SafeFetchException(
                            SafeFetchErrorCode.FETCH_FAILED,
                            f"Received HTTP {response.status_code} redirect without Location header",
                        )

                    current_url = urljoin(current_url, location)
                    continue

                # Stream response content with size limit
                content_bytes = bytearray()
                async for chunk in response.aiter_bytes():
                    content_bytes.extend(chunk)
                    if len(content_bytes) > max_bytes:
                        raise SafeFetchException(
                            SafeFetchErrorCode.SIZE_EXCEEDED,
                            f"Response exceeded maximum size limit of {max_bytes} bytes",
                            {"bytes_received": len(content_bytes), "max_bytes": max_bytes},
                        )

                raw_bytes = bytes(content_bytes)
                raw_hash = hashlib.sha256(raw_bytes).hexdigest()
                text = raw_bytes.decode("utf-8", errors="replace")
                duration_ms = (time.time() - start_time) * 1000.0

                return {
                    "ok": True,
                    "body": text,
                    "http_status": response.status_code,
                    "content_type": response.headers.get("content-type", "text/html"),
                    "raw_hash": raw_hash,
                    "final_url": current_url,
                    "host": hostname,
                    "path": path,
                    "duration_ms": duration_ms,
                }

            except httpx.TimeoutException as e:
                raise SafeFetchException(
                    SafeFetchErrorCode.TIMEOUT,
                    f"Request timed out: {e}",
                    {"timeout_seconds": read_timeout},
                )
            except httpx.RequestError as e:
                raise SafeFetchException(
                    SafeFetchErrorCode.FETCH_FAILED,
                    f"HTTP request error: {e}",
                )

    raise SafeFetchException(SafeFetchErrorCode.UNTRUSTED_LINK, "Exceeded maximum redirects")

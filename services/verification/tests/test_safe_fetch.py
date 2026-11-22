import pytest
from app.safe_fetch import is_forbidden_ip, validate_url_safety, SafeFetchException
from app.schemas import SafeFetchErrorCode


def test_is_forbidden_ip():
    # AWS / Cloud metadata is ALWAYS forbidden
    forbidden, reason = is_forbidden_ip("169.254.169.254", allow_loopback=True)
    assert forbidden is True
    assert "metadata" in reason.lower()

    # RFC 1918 Private Ranges
    assert is_forbidden_ip("10.0.0.1")[0] is True
    assert is_forbidden_ip("172.16.5.10")[0] is True
    assert is_forbidden_ip("192.168.1.1")[0] is True

    # Carrier NAT
    assert is_forbidden_ip("100.64.0.1")[0] is True

    # Loopback (127.0.0.1)
    assert is_forbidden_ip("127.0.0.1", allow_loopback=False)[0] is True
    assert is_forbidden_ip("127.0.0.1", allow_loopback=True)[0] is False

    # IPv6
    assert is_forbidden_ip("::1", allow_loopback=False)[0] is True
    assert is_forbidden_ip("::1", allow_loopback=True)[0] is False
    assert is_forbidden_ip("fe80::1")[0] is True
    assert is_forbidden_ip("fc00::1")[0] is True

    # Public IP
    assert is_forbidden_ip("8.8.8.8")[0] is False
    assert is_forbidden_ip("1.1.1.1")[0] is False


def test_validate_url_safety_scheme():
    # Insecure HTTP rejected when dev flag is False
    with pytest.raises(SafeFetchException) as exc_info:
        validate_url_safety(
            "http://mock-provider.payproof.internal/receipt",
            allowlist_hosts=["mock-provider.payproof.internal"],
            allow_http_for_dev=False,
        )
    assert exc_info.value.code == SafeFetchErrorCode.UNTRUSTED_LINK
    assert "HTTPS required" in exc_info.value.message


def test_validate_url_safety_credentials():
    with pytest.raises(SafeFetchException) as exc_info:
        validate_url_safety(
            "https://user:pass@mock-provider.payproof.internal/receipt",
            allowlist_hosts=["mock-provider.payproof.internal"],
        )
    assert exc_info.value.code == SafeFetchErrorCode.UNTRUSTED_LINK
    assert "credentials" in exc_info.value.message.lower()


def test_validate_url_safety_allowlist():
    with pytest.raises(SafeFetchException) as exc_info:
        validate_url_safety(
            "https://evil-lookalike.com/receipt",
            allowlist_hosts=["mock-provider.payproof.internal"],
        )
    assert exc_info.value.code == SafeFetchErrorCode.UNTRUSTED_LINK
    assert "not on the provider allowlist" in exc_info.value.message


def test_validate_url_safety_ssrf():
    # Directly targeting AWS metadata IP
    with pytest.raises(SafeFetchException) as exc_info:
        validate_url_safety(
            "http://169.254.169.254/latest/meta-data",
            allowlist_hosts=["169.254.169.254"],
            allow_http_for_dev=True,
        )
    assert exc_info.value.code == SafeFetchErrorCode.SSRF_BLOCKED

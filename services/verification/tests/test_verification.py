import pytest
from app.parsers.mock_parser import parse_mock_receipt_html
from app.schemas import ProviderKind, ProviderPaymentStatus, SafeFetchErrorCode
from app.safe_fetch import SafeFetchException


def test_parse_mock_receipt_html_success():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <body>
      <span id="status-badge">SUCCESS</span>
      <span id="receipt-amount">150.00</span>
      <span id="receipt-txnid">TXN_99887766</span>
      <span id="receipt-date">2026-11-22T10:00:00Z</span>
      <span id="receipt-receiver-name">Addis Mart - Bole Branch</span>
      <span id="receipt-receiver-account">1000123456789</span>
      <span id="receipt-payer-name">Abebe Bikila</span>
    </body>
    </html>
    """

    evidence = parse_mock_receipt_html(
        html=sample_html,
        provider=ProviderKind.TELEBIRR,
        host="mock-provider.payproof.internal",
        path="/receipt/telebirr/TXN_99887766",
        raw_hash="a" * 64,
        http_status=200,
        duration_ms=45.2,
    )

    assert evidence.provider == ProviderKind.TELEBIRR
    assert evidence.transaction_id == "TXN_99887766"
    assert evidence.amount_minor == 15000  # 150.00 ETB in integer santim
    assert evidence.status == ProviderPaymentStatus.SUCCESS
    assert evidence.receiver_name == "Addis Mart - Bole Branch"
    assert evidence.currency == "ETB"
    assert evidence.raw_hash == "a" * 64


def test_parse_mock_receipt_html_pending():
    sample_html = """
    <html><body>
      <span id="status-badge">PENDING</span>
      <span id="receipt-amount">50.50</span>
      <span id="receipt-txnid">TXN_PENDING_01</span>
    </body></html>
    """
    evidence = parse_mock_receipt_html(
        html=sample_html,
        provider=ProviderKind.CBE,
        host="mock-provider.payproof.internal",
        path="/receipt/cbe/TXN_PENDING_01",
        raw_hash="b" * 64,
        http_status=200,
        duration_ms=20.0,
    )
    assert evidence.status == ProviderPaymentStatus.PENDING
    assert evidence.amount_minor == 5050  # 50.50 ETB


def test_parse_mock_receipt_malformed_fails_safely():
    broken_html = "<html><body><h1>Error 500</h1><p>Not found</p></body></html>"
    with pytest.raises(SafeFetchException) as exc_info:
        parse_mock_receipt_html(
            html=broken_html,
            provider=ProviderKind.MOCK,
            host="mock-provider.payproof.internal",
            path="/bad",
            raw_hash="c" * 64,
            http_status=200,
            duration_ms=10.0,
        )
    assert exc_info.value.code == SafeFetchErrorCode.MALFORMED_PAGE

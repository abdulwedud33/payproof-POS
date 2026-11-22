from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ProviderKind(str, Enum):
    TELEBIRR = "telebirr"
    CBE = "cbe"
    MOCK = "mock"


class ProviderPaymentStatus(str, Enum):
    SUCCESS = "success"
    PENDING = "pending"
    FAILED = "failed"
    REVERSED = "reversed"


class SafeFetchErrorCode(str, Enum):
    UNTRUSTED_LINK = "UNTRUSTED_LINK"
    SSRF_BLOCKED = "SSRF_BLOCKED"
    TIMEOUT = "TIMEOUT"
    SIZE_EXCEEDED = "SIZE_EXCEEDED"
    FETCH_FAILED = "FETCH_FAILED"
    MALFORMED_PAGE = "MALFORMED_PAGE"


class ProviderEvidence(BaseModel):
    provider: ProviderKind
    transaction_id: str = Field(..., min_length=1, max_length=64)
    amount_minor: int = Field(..., ge=0)
    currency: str = "ETB"
    payment_timestamp: str
    status: ProviderPaymentStatus
    receiver_name: Optional[str] = None
    receiver_account_masked: Optional[str] = None
    payer_name_masked: Optional[str] = None
    link_host: str
    link_path: str
    raw_hash: str = Field(..., min_length=64, max_length=64)
    http_status: int = Field(..., ge=100, le=599)
    parser_version: str
    fetch_duration_ms: float = Field(..., ge=0)


class FetchEvidenceRequest(BaseModel):
    qr_text: str = Field(..., min_length=5, max_length=2048)
    sale_id: str = Field(..., min_length=10)
    provider_hint: Optional[ProviderKind] = None


class SafeFetchError(BaseModel):
    code: SafeFetchErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None


class SafeFetchResult(BaseModel):
    ok: bool
    evidence: Optional[ProviderEvidence] = None
    error: Optional[SafeFetchError] = None

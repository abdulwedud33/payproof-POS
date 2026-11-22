import os
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse

from app.schemas import (
    FetchEvidenceRequest,
    SafeFetchResult,
    SafeFetchError,
    ProviderKind,
    SafeFetchErrorCode,
)
from app.safe_fetch import safe_fetch_page, SafeFetchException
from app.parsers.mock_parser import parse_mock_receipt_html

app = FastAPI(
    title="PayProof Verification Service",
    description="Isolated provider receipt lookup, safe fetching, and evidence parsing service",
    version="0.1.0",
)

ALLOWLIST_HOSTS = [
    h.strip()
    for h in os.getenv(
        "PROVIDER_ALLOWLIST_HOSTS",
        "mock-provider.payproof.internal,localhost,127.0.0.1",
    ).split(",")
    if h.strip()
]
ALLOW_HTTP_FOR_DEV = os.getenv("ALLOW_HTTP_FOR_DEV", "true").lower() == "true"
ALLOW_LOOPBACK_FOR_DEV = os.getenv("ALLOW_LOOPBACK_FOR_DEV", "true").lower() == "true"


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "verification",
        "allowlist_hosts": ALLOWLIST_HOSTS,
    }


@app.post("/v1/evidence/fetch", response_model=SafeFetchResult)
async def fetch_evidence(request: FetchEvidenceRequest):
    try:
        fetch_res = await safe_fetch_page(
            url=request.qr_text,
            allowlist_hosts=ALLOWLIST_HOSTS,
            allow_http_for_dev=ALLOW_HTTP_FOR_DEV,
            allow_loopback_for_dev=ALLOW_LOOPBACK_FOR_DEV,
        )

        provider = request.provider_hint or ProviderKind.MOCK
        if "cbe" in request.qr_text.lower():
            provider = ProviderKind.CBE
        elif "telebirr" in request.qr_text.lower():
            provider = ProviderKind.TELEBIRR

        evidence = parse_mock_receipt_html(
            html=fetch_res["body"],
            provider=provider,
            host=fetch_res["host"],
            path=fetch_res["path"],
            raw_hash=fetch_res["raw_hash"],
            http_status=fetch_res["http_status"],
            duration_ms=fetch_res["duration_ms"],
        )

        return SafeFetchResult(ok=True, evidence=evidence)

    except SafeFetchException as e:
        return SafeFetchResult(
            ok=False,
            error=SafeFetchError(
                code=e.code,
                message=e.message,
                details=e.details,
            ),
        )
    except Exception as e:
        return SafeFetchResult(
            ok=False,
            error=SafeFetchError(
                code=SafeFetchErrorCode.FETCH_FAILED,
                message=f"Unexpected internal fetch error: {str(e)}",
            ),
        )

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("bekatuz")


class DomainError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def _validation_detail(exc: RequestValidationError) -> str:
    parts: list[str] = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err.get("loc", []))
        message = err.get("msg", "invalid value")
        parts.append(f"{loc}: {message}" if loc else message)
    return "; ".join(parts) or "Validation error"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain_error(request: Request, exc: DomainError):
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):
        return JSONResponse({"detail": _validation_detail(exc)}, status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException):
        detail = exc.detail
        if not isinstance(detail, str):
            detail = str(detail)
        return JSONResponse({"detail": detail}, status_code=exc.status_code)

    @app.exception_handler(404)
    async def _not_found(request: Request, exc):
        return JSONResponse({"detail": "Not found"}, status_code=404)

    @app.exception_handler(405)
    async def _method_not_allowed(request: Request, exc):
        return JSONResponse({"detail": "Method not allowed"}, status_code=405)

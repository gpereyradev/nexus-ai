import hmac
import os
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from .forecast import ForecastInput, InsufficientHistory, VERSION, forecast

@asynccontextmanager
async def lifespan(app):
    key = os.environ.get("ANALYTICS_API_KEY", "")
    if len(key) < 32 or key.startswith("CHANGE_ME"):
        raise RuntimeError("Configura ANALYTICS_API_KEY con npm run setup.")
    app.state.api_key = key
    yield

app = FastAPI(title="NEXUS Analytics",version=VERSION,lifespan=lifespan,docs_url=None,redoc_url=None,openapi_url=None)

def authenticated(request: Request, x_analytics_key: str = Header(default="")):
    if not hmac.compare_digest(x_analytics_key.encode(),request.app.state.api_key.encode()):
        raise HTTPException(401,"Acceso interno requerido")

@app.exception_handler(RequestValidationError)
async def invalid(request, error):
    # Do not reflect input values, headers or business payloads in errors.
    return JSONResponse(status_code=422,content={"code":"INVALID_SERIES","detail":"Revisa las fechas, cantidades y continuidad de la serie."})

@app.get("/health")
def health():
    return {"status":"UP","application":"nexus-analytics","version":VERSION}

@app.post("/v1/forecast",dependencies=[Depends(authenticated)])
def create_forecast(data: ForecastInput):
    try:
        return forecast(data)
    except InsufficientHistory as error:
        return JSONResponse(status_code=422,content={"code":"INSUFFICIENT_HISTORY","detail":str(error)})

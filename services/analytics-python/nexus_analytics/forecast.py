"""Small, reproducible daily-revenue experiment; no network or database access."""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from math import ceil, isfinite
from zoneinfo import ZoneInfo
from statistics import median
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from pydantic import BaseModel, ConfigDict, Field, model_validator

VERSION = "1.0.0"
BASELINE = "seasonal_naive_v1"
CANDIDATE = "ridge_calendar_v1"
MIN_DAYS = 84

class Day(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: date
    value: Decimal = Field(ge=0, max_digits=20, decimal_places=2, allow_inf_nan=False)

class Product(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=36)
    sku: str = Field(max_length=40)
    name: str = Field(max_length=160)
    stock: int = Field(ge=0, le=2147483647)
    minStock: int = Field(ge=0, le=2147483647)
    unitsSold: int = Field(ge=0)

class ForecastInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    forecastHorizonDays: int = Field(default=7, ge=1, le=14)
    series: list[Day] = Field(min_length=1, max_length=366)
    products: list[Product] = Field(default_factory=list, max_length=1000)
    productCount: int = Field(ge=0)
    demandWindowDays: int = Field(ge=1, le=28)
    demoData: bool
    stockAsOf: datetime
    @model_validator(mode="after")
    def consecutive_dates(self):
        for left, right in zip(self.series, self.series[1:]):
            if right.date != left.date + timedelta(days=1):
                raise ValueError("La serie debe estar ordenada, sin huecos ni fechas repetidas.")
        if self.productCount < len(self.products):
            raise ValueError("El universo de productos es inconsistente.")
        return self

class InsufficientHistory(ValueError):
    pass

def money(value):
    if not isfinite(float(value)):
        raise ValueError("Resultado numérico no finito")
    return format(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), ".2f")

def features(dates, origin):
    return np.asarray([[(d-origin).days] + [float(d.weekday()==i) for i in range(1,7)] for d in dates])

def predict(method, dates, values, future):
    """Only the supplied past is available to either method, including multi-step evaluation."""
    if method == BASELINE:
        return np.asarray([values[-7 + (i % 7)] for i in range(len(future))])
    model = make_pipeline(StandardScaler(), Ridge(alpha=1.0))
    model.fit(features(dates, dates[0]), values)
    return np.clip(model.predict(features(future, dates[0])), 0, 1e18)

def mae(actual, predicted):
    return float(np.mean(np.abs(np.asarray(actual)-predicted)))

def forecast(data: ForecastInput):
    # Zeros before the first observed sale are not evidence of an operating history.
    first = next((i for i,d in enumerate(data.series) if d.value > 0), len(data.series))
    series = data.series[first:]
    if len(series) < MIN_DAYS or sum(d.value > 0 for d in series) < 28:
        raise InsufficientHistory("Se requieren al menos 84 días desde la primera venta y 28 días con ventas confirmadas dentro del período.")
    dates = [d.date for d in series]
    values = np.asarray([float(d.value) for d in series])
    train_end = len(series)-28
    validation_end = len(series)-14
    selection = {}
    holdout = {}
    for method in (BASELINE, CANDIDATE):
        selection[method] = mae(values[train_end:validation_end], predict(method, dates[:train_end], values[:train_end], dates[train_end:validation_end]))
        holdout[method] = mae(values[validation_end:], predict(method, dates[:validation_end], values[:validation_end], dates[validation_end:]))
    # A zero-error baseline cannot be beaten. Keep it on ties or <10% improvement.
    selected = CANDIDATE if selection[CANDIDATE] < selection[BASELINE]*0.9 and holdout[CANDIDATE] < holdout[BASELINE]*0.9 else BASELINE
    future = [dates[-1]+timedelta(days=i+1) for i in range(data.forecastHorizonDays)]
    predictions = predict(selected, dates, values, future)
    warnings = [
        "Estimaciones orientativas, sin garantía ni intervalo de confianza calibrado.",
        "Los dos bloques temporales de 14 días se usan para decidir si conservar el modelo; el MAE no es una evaluación independiente posterior a esa decisión.",
        "Días sin ventas se consideran cero. No se observan demanda perdida, promociones ni quiebres de stock; una correlación no explica causas.",
        "Reposición: promedio diario de unidades confirmadas en los últimos 28 días del período (o los disponibles); objetivo de 14 días menos el stock actual. No contempla plazos de proveedor ni estacionalidad futura.",
    ]
    if selected == BASELINE:
        warnings.append("El modelo Ridge no superó el baseline en al menos 10% en ambos bloques; se conserva la referencia semanal.")
    if data.demoData:
        warnings.append("Incluye datos ficticios de demostración; el resultado no valida demanda de un negocio real.")
    today = datetime.now(ZoneInfo("America/Lima")).date()
    if (today-dates[-1]).days > 1:
        warnings.append("El historial termina en una fecha pasada: el pronóstico sigue a ese cierre, no a la fecha actual.")
    if first:
        warnings.append("Se omitieron días anteriores a la primera venta observada; no prueban historial disponible.")
    if data.productCount > len(data.products):
        warnings.append("La reposición examina solo los primeros 1000 productos activos priorizados por stock bajo y SKU.")
    anomalies = []
    for i in range(28,len(series)):
        past = values[i-28:i]
        center = float(median(past));mad = float(median(abs(x-center) for x in past))
        threshold = max(3.5*1.4826*mad, abs(center)*0.2, 1.0)
        if abs(values[i]-center) > threshold:
            anomalies.append({"date":str(dates[i]),"value":money(series[i].value),"reference":money(center),"threshold":money(threshold),"reason":"Desvío frente a la mediana de los 28 días anteriores; umbral max(3.5 × 1.4826 × MAD, 20% de la mediana, S/1). Puede ser un falso positivo."})
    replenishment = []
    for p in data.products:
        demand = Decimal(p.unitsSold)/Decimal(data.demandWindowDays)
        target = ceil(demand*14)
        suggested = max(0,target-p.stock)
        if suggested or p.stock <= p.minStock:
            replenishment.append({"id":p.id,"sku":p.sku,"name":p.name,"stock":p.stock,"minStock":p.minStock,"unitsSold":p.unitsSold,"dailyUnits":money(demand),"coverageDays":money(Decimal(p.stock)/demand) if demand else None,"targetUnits":target,"suggestedUnits":suggested})
    replenishment.sort(key=lambda p:(-p["suggestedUnits"],p["stock"],p["sku"]))
    total = sum((d.value for d in series),Decimal(0))
    return {
        "metric":"daily_sales_pen","forecastHorizonDays":data.forecastHorizonDays,"method":selected,"methodVersion":VERSION,
        "currency":"PEN","timezone":"America/Lima","generatedAt":datetime.now(timezone.utc).isoformat(),"demoData":data.demoData,"stockAsOf":data.stockAsOf,
        "trainingPeriod":{"from":str(dates[0]),"to":str(dates[-1]),"days":len(series),"nonzeroDays":sum(d.value>0 for d in series)},
        "evaluation":{"selectionFrom":str(dates[train_end]),"selectionTo":str(dates[validation_end-1]),"testFrom":str(dates[validation_end]),"testTo":str(dates[-1]),"fitTo":str(dates[validation_end-1]),"sampleSize":14,"selectionBaselineMAE":money(selection[BASELINE]),"selectionCandidateMAE":money(selection[CANDIDATE]),"baselineMAE":money(holdout[BASELINE]),"candidateMAE":money(holdout[CANDIDATE]),"mae":money(holdout[selected]),"candidateMethod":CANDIDATE,"minimumImprovementPercent":10},
        "history":[{"date":str(d.date),"value":money(d.value)} for d in series],
        "predictions":[{"date":str(d),"value":money(v)} for d,v in zip(future,predictions)],
        "summary":{"total":money(total),"dailyAverage":money(total/len(series)),"minimum":money(min(d.value for d in series)),"maximum":money(max(d.value for d in series))},
        "anomalies":anomalies[-10:],"replenishment":replenishment[:10],"warnings":warnings,
    }

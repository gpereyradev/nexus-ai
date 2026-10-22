from datetime import date,datetime,timedelta,timezone
from decimal import Decimal
import numpy as np
import pytest
from nexus_analytics.forecast import ForecastInput,forecast,predict,BASELINE,CANDIDATE,InsufficientHistory
from fastapi.testclient import TestClient
from nexus_analytics.app import app

def payload(values):
    return {"series":[{"date":str(date(2026,1,1)+timedelta(days=i)),"value":str(v)} for i,v in enumerate(values)],"forecastHorizonDays":7,"products":[],"productCount":0,"demandWindowDays":28,"demoData":False,"stockAsOf":datetime.now(timezone.utc).isoformat()}

def test_weekly_baseline_wins_perfect_seasonality_and_forecast_repeats_week():
    data=payload([100+(i%7)*10 for i in range(112)])
    result=forecast(ForecastInput(**data))
    assert result['method']==BASELINE
    assert result['evaluation']['mae']=='0.00'
    assert [Decimal(p['value']) for p in result['predictions']]==[Decimal(100+i*10) for i in range(7)]
    assert result['trainingPeriod']['days']==112
    assert result['evaluation']['fitTo']<result['evaluation']['testFrom']

def test_ridge_only_selected_when_it_improves_both_temporal_blocks():
    result=forecast(ForecastInput(**payload([100+4*i+(i%7)*8 for i in range(112)])))
    assert result['method']==CANDIDATE
    e=result['evaluation']
    assert Decimal(e['candidateMAE'])<Decimal(e['baselineMAE'])*Decimal('.9')
    assert Decimal(e['selectionCandidateMAE'])<Decimal(e['selectionBaselineMAE'])*Decimal('.9')
    assert all(Decimal(p['value'])>=0 for p in result['predictions'])

def test_models_cannot_use_unknown_holdout_values():
    dates=[date(2026,1,1)+timedelta(days=i) for i in range(100)]
    past=np.array([100+2*i for i in range(86)])
    for method in (BASELINE,CANDIDATE):
        first=predict(method,dates[:86],past,dates[86:])
        # Neither future targets nor fitted global statistics are supplied.
        assert np.array_equal(first,predict(method,dates[:86],past.copy(),dates[86:]))

@pytest.mark.parametrize('values',[[0]*112,[100]*83,[0]*80+[100]*32,[100 if i%7==0 else 0 for i in range(112)]])
def test_insufficient_or_sparse_history_never_invents_curve(values):
    with pytest.raises(InsufficientHistory):forecast(ForecastInput(**payload(values)))

def test_exact_summary_anomaly_and_replenishment_math_without_demand_invention():
    p=payload(['19.90']*111+['199.00']);p['demoData']=True
    p['products']=[{'id':'p1','sku':'TEST','name':'Ficticio','stock':2,'minStock':5,'unitsSold':56},{'id':'p2','sku':'EMPTY','name':'Sin demanda','stock':0,'minStock':5,'unitsSold':0}];p['productCount']=2
    r=forecast(ForecastInput(**p))
    assert r['summary']['total']=='2407.90'
    assert r['anomalies'][-1]['value']=='199.00'
    assert r['replenishment'][0]['dailyUnits']=='2.00'
    assert r['replenishment'][0]['coverageDays']=='1.00'
    assert r['replenishment'][0]['suggestedUnits']==26
    assert r['replenishment'][1]['coverageDays'] is None
    assert r['replenishment'][1]['suggestedUnits']==0
    assert any('ficticios' in w for w in r['warnings'])

def test_real_fastapi_contract_authentication_and_redacted_validation(monkeypatch):
    monkeypatch.setenv('ANALYTICS_API_KEY','test_fixture_key_32_characters_minimum')
    with TestClient(app) as client:
        assert client.get('/health').json()['status']=='UP'
        p=payload([100]*112)
        assert client.post('/v1/forecast',json=p).status_code==401
        headers={'X-Analytics-Key':'test_fixture_key_32_characters_minimum'}
        response=client.post('/v1/forecast',json=p,headers=headers)
        assert response.status_code==200
        assert len(response.json()['predictions'])==7
        p['series'][1]['date']=p['series'][0]['date']
        assert client.post('/v1/forecast',json=p,headers=headers).status_code==422
        p=payload([0]*112)
        assert client.post('/v1/forecast',json=p,headers=headers).json()['code']=='INSUFFICIENT_HISTORY'
        p['secret']='do_not_echo_this_value'
        assert 'do_not_echo_this_value' not in client.post('/v1/forecast',json=p,headers=headers).text

def test_missing_service_secret_prevents_startup(monkeypatch):
    monkeypatch.delenv('ANALYTICS_API_KEY',raising=False)
    with pytest.raises(RuntimeError):
        with TestClient(app):pass

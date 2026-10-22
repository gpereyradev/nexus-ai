package pe.guillermo.nexus.analytics;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import pe.guillermo.nexus.operations.BusinessException;
import static pe.guillermo.nexus.analytics.AnalyticsDtos.*;
@Component
public class AnalyticsClient {
    private final ObjectMapper json;
    private final String base,key;
    private final boolean enabled;
    private final int timeoutMs;
    private final Semaphore permits=new Semaphore(2);
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).followRedirects(HttpClient.Redirect.NEVER).build();
    public AnalyticsClient(ObjectMapper json,@Value("${nexus.analytics.url}") String base,@Value("${nexus.analytics.key}") String key,@Value("${nexus.analytics.enabled}") boolean enabled,@Value("${nexus.analytics.timeout-ms:8000}") int timeoutMs) {
        this.json=json;this.base=base;this.key=key;this.enabled=enabled;this.timeoutMs=timeoutMs;
    }
    public ForecastResult forecast(Payload payload) {
        if(!enabled || key.length()<32 || key.startsWith("CHANGE_ME"))throw unavailable();
        if(!permits.tryAcquire())throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,"ANALYTICS_BUSY","Ya hay dos análisis en curso. Intenta nuevamente en unos segundos.");
        CompletableFuture<HttpResponse<String>> pending=null;
        try {
            URI uri=URI.create(base);
            if(!Set.of("http","https").contains(uri.getScheme()) || !Set.of("localhost","127.0.0.1","[::1]","analytics").contains(uri.getHost()) || uri.getRawUserInfo()!=null || uri.getRawQuery()!=null || uri.getRawFragment()!=null || !(uri.getPath().isEmpty() || uri.getPath().equals("/")))throw unavailable();
            var request=HttpRequest.newBuilder(uri.resolve("/v1/forecast")).timeout(Duration.ofMillis(timeoutMs)).header("Content-Type","application/json").header("X-Analytics-Key",key).POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build();
            pending=client.sendAsync(request,HttpResponse.BodyHandlers.ofString());
            var response=pending.get(timeoutMs,TimeUnit.MILLISECONDS);
            if(response.statusCode()==422) {
                var error=json.readTree(response.body());
                if("INSUFFICIENT_HISTORY".equals(error.path("code").asText()))throw new BusinessException(HttpStatus.UNPROCESSABLE_ENTITY,"INSUFFICIENT_HISTORY","Historial insuficiente: se requieren 84 días desde la primera venta y 28 días con ventas confirmadas en el período.");
                throw unavailable();
            }
            if(response.statusCode()!=200 || response.body().length()>2_000_000)throw unavailable();
            var result=json.readValue(response.body(),ForecastResult.class);
            validate(result,payload);
            return result;
        } catch(BusinessException e) { throw e;
        } catch(InterruptedException e) { Thread.currentThread().interrupt();throw unavailable();
        } catch(Exception e) { throw unavailable();
        } finally {if(pending!=null && !pending.isDone())pending.cancel(true);permits.release();}
    }
    private void validate(ForecastResult r,Payload input) {
        if(!"daily_sales_pen".equals(r.metric()) || !"PEN".equals(r.currency()) || !"America/Lima".equals(r.timezone()) || !"1.0.0".equals(r.methodVersion()) || !Set.of("seasonal_naive_v1","ridge_calendar_v1").contains(r.method()) || r.forecastHorizonDays()!=input.forecastHorizonDays() || r.generatedAt()==null || r.stockAsOf()==null || r.trainingPeriod()==null || r.evaluation()==null || r.summary()==null || r.warnings()==null || r.warnings().isEmpty() || r.anomalies()==null || r.replenishment()==null || r.history()==null || r.predictions()==null || r.predictions().size()!=input.forecastHorizonDays() || r.demoData()!=input.demoData())throw unavailable();
        if(r.history().size()<84 || r.history().size()>input.series().size() || r.evaluation().sampleSize()!=14 || r.trainingPeriod().days()!=r.history().size())throw unavailable();
        LocalDate end=input.series().get(input.series().size()-1).date();
        for(int i=0;i<r.predictions().size();i++) {var p=r.predictions().get(i);if(!end.plusDays(i+1).equals(p.date()))throw unavailable();decimal(p.value());}
        int offset=input.series().size()-r.history().size();
        for(int i=0;i<r.history().size();i++){var p=r.history().get(i);var original=input.series().get(offset+i);if(!original.date().equals(p.date()) || decimal(p.value()).compareTo(original.value())!=0)throw unavailable();}
        decimal(r.evaluation().mae());decimal(r.evaluation().baselineMAE());decimal(r.evaluation().candidateMAE());decimal(r.summary().total());
        if(!r.trainingPeriod().to().equals(end) || !r.trainingPeriod().from().equals(r.history().get(0).date()) || !r.evaluation().fitTo().isBefore(r.evaluation().testFrom()))throw unavailable();
    }
    private java.math.BigDecimal decimal(String value){if(value==null || !value.matches("[0-9]{1,24}\\.[0-9]{2}"))throw unavailable();return new java.math.BigDecimal(value);}
    private BusinessException unavailable() {return new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,"ANALYTICS_UNAVAILABLE","El servicio de análisis no está disponible. Comprueba Python y vuelve a intentar. Inventario y ventas siguen disponibles.");}
}

package pe.guillermo.nexus.analytics;
import static org.assertj.core.api.Assertions.*;
import java.net.*;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import com.sun.net.httpserver.HttpServer;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import pe.guillermo.nexus.operations.BusinessException;
import static pe.guillermo.nexus.analytics.AnalyticsDtos.*;
class AnalyticsClientTest {
    private HttpServer server;private ExecutorService executor;
    private final JsonMapper json=JsonMapper.builder().addModule(new JavaTimeModule()).build();
    private static final String KEY="fixture_internal_key_at_least_32_chars";
    private Payload payload() {var days=new ArrayList<Day>();for(int i=0;i<112;i++)days.add(new Day(LocalDate.of(2026,1,1).plusDays(i),new BigDecimal("1.00")));return new Payload(7,days,List.of(),0,28,false,Instant.now());}
    private ForecastResult valid(Payload p) {
        var history=p.series().stream().map(d->new Point(d.date(),"1.00")).toList();var end=history.get(111).date();var future=new ArrayList<Point>();for(int i=1;i<=7;i++)future.add(new Point(end.plusDays(i),"1.00"));
        return new ForecastResult(null,"daily_sales_pen",7,"seasonal_naive_v1","1.0.0","PEN","America/Lima",Instant.now(),false,p.stockAsOf(),new AnalyticsDtos.Period(history.get(0).date(),end,112,112),new Evaluation(end.minusDays(27),end.minusDays(14),end.minusDays(13),end,end.minusDays(14),14,"0.00","1.00","0.00","1.00","0.00","ridge_calendar_v1",10),history,future,new Summary("112.00","1.00","1.00","1.00"),List.of(),List.of(),List.of("Estimación orientativa"));
    }
    private AnalyticsClient server(int status,String body,long delay) throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);executor=Executors.newCachedThreadPool();server.setExecutor(executor);
        server.createContext("/v1/forecast",e->{try{if(delay>0)Thread.sleep(delay);e.getRequestBody().readAllBytes();byte[] bytes=body.getBytes(java.nio.charset.StandardCharsets.UTF_8);e.getResponseHeaders().set("Content-Type","application/json");e.sendResponseHeaders(status,bytes.length);e.getResponseBody().write(bytes);}catch(Exception ignored){}finally{e.close();}});server.start();
        return new AnalyticsClient(json,"http://127.0.0.1:"+server.getAddress().getPort(),KEY,true,delay>0?100:2000);
    }
    @AfterEach void stop(){if(server!=null)server.stop(0);if(executor!=null)executor.shutdownNow();}
    @Test void validResponsePreservesHistoryAndForecastContract() throws Exception {var p=payload();var client=server(200,json.writeValueAsString(valid(p)),0);assertThat(client.forecast(p).predictions()).hasSize(7);}
    @ParameterizedTest @ValueSource(ints={401,302,500}) void failuresAreRecoverableAndNeverReflectInternalDetails(int status) throws Exception {var client=server(status,"sensitive upstream details",0);assertThatThrownBy(()->client.forecast(payload())).isInstanceOfSatisfying(BusinessException.class,e->{assertThat(e.status.value()).isEqualTo(503);assertThat(e.getMessage()).doesNotContain("sensitive");});}
    @Test void insufficientHistoryRemainsASeparateBusinessState() throws Exception {var client=server(422,"{\"code\":\"INSUFFICIENT_HISTORY\"}",0);assertThatThrownBy(()->client.forecast(payload())).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status.value()).isEqualTo(422));}
    @Test void malformedSuccessIsNotShownAsAForecast() throws Exception {var client=server(200,"{}",0);assertThatThrownBy(()->client.forecast(payload())).isInstanceOf(BusinessException.class);}
    @Test void timeoutCancelsSlowRequestAndReleasesPermit() throws Exception {var p=payload();var client=server(200,json.writeValueAsString(valid(p)),600);long start=System.nanoTime();assertThatThrownBy(()->client.forecast(p)).isInstanceOf(BusinessException.class);assertThat(Duration.ofNanos(System.nanoTime()-start)).isLessThan(Duration.ofSeconds(3));}
    @Test void disabledServiceAndUntrustedUrlNeverSendData() {var client=new AnalyticsClient(json,"https://untrusted.invalid",KEY,true,2000);assertThatThrownBy(()->client.forecast(payload())).isInstanceOf(BusinessException.class);assertThatThrownBy(()->new AnalyticsClient(json,"http://127.0.0.1",KEY,false,2000).forecast(payload())).isInstanceOf(BusinessException.class);}
}

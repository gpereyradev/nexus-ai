package pe.guillermo.nexus;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import pe.guillermo.nexus.analytics.*;
import pe.guillermo.nexus.auth.AccountService;
import pe.guillermo.nexus.operations.*;
import static pe.guillermo.nexus.analytics.AnalyticsDtos.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc @Transactional
class AnalyticsIT {
    @Autowired AnalyticsRuns runs;
    @Autowired AnalyticsAggregates aggregates;@Autowired DemoDatasetService seed;@Autowired AccountService accounts;@Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;@Autowired com.fasterxml.jackson.databind.ObjectMapper json;@Autowired OperationsService operations;
    @MockitoBean AnalyticsClient client;
    @BeforeEach void data(){if(!accounts.exists("admin@nexus.demo"))accounts.create(new AccountService.NewAccount("Demo ADMIN","admin@nexus.demo","analytics_test_fixture_password_2026",AccountService.Role.ADMIN));seed.seed();org.mockito.Mockito.when(client.forecast(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation->{var p=(Payload)invocation.getArgument(0);var end=p.series().get(p.series().size()-1).date();return new ForecastResult(null,"daily_sales_pen",7,"seasonal_naive_v1","1.0.0","PEN","America/Lima",java.time.Instant.now(),true,p.stockAsOf(),new AnalyticsDtos.Period(p.series().get(0).date(),end,p.series().size(),113),new Evaluation(end.minusDays(27),end.minusDays(14),end.minusDays(13),end,end.minusDays(14),14,"1.00","2.00","1.00","2.00","1.00","ridge_calendar_v1",10),List.of(),List.of(),new Summary("1.00","1.00","1.00","1.00"),List.of(),List.of(),List.of("Fixture de autorización"));});SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin@nexus.demo",null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));}
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    private ForecastInput input(){return new ForecastInput(LocalDate.parse("2026-07-01"),LocalDate.parse("2026-10-21"),7);}
    @Test void aggregateMatchesSqlWithoutSendingCustomerOrAccountData() throws Exception {
        var p=aggregates.load(input());assertThat(p.series()).hasSize(113);assertThat(p.products()).hasSize(30);assertThat(p.demoData()).isTrue();assertThat(p.demandWindowDays()).isEqualTo(28);
        assertThat(p.series().stream().map(Day::value).reduce(BigDecimal.ZERO,BigDecimal::add)).isEqualByComparingTo(jdbc.queryForObject("SELECT SUM(total) FROM sales WHERE code LIKE 'DEMO-%'",BigDecimal.class));
        String body=json.writeValueAsString(p);assertThat(body).doesNotContain("customer","email","password","JSESSIONID","Cliente demo");
        long units=jdbc.queryForObject("SELECT SUM(i.quantity) FROM sales_items i JOIN sales s ON s.id=i.sale_id WHERE s.status='CONFIRMED' AND (s.occurred_at AT TIME ZONE 'America/Lima')::date BETWEEN '2026-09-24' AND '2026-10-21'",Long.class);
        assertThat(p.products().stream().mapToLong(Product::unitsSold).sum()).isEqualTo(units);
    }
    @Test void cancelledSaleIsExcludedImmediatelyWithoutStaleCache(){var before=aggregates.load(input());var id=jdbc.queryForObject("SELECT id FROM sales WHERE code='DEMO-2026-000001'",java.util.UUID.class);var total=operations.sale(id).total();operations.cancel(id,new OperationDtos.CancellationInput("Prueba de agregados"));var after=aggregates.load(input());assertThat(after.series().get(0).value()).isEqualByComparingTo(before.series().get(0).value().subtract(total));}
    @Test void partialFutureAndOversizedPeriodsAreRejected(){assertThatThrownBy(()->aggregates.load(new ForecastInput(LocalDate.now().minusDays(10),LocalDate.now().plusDays(1),7))).isInstanceOf(BusinessException.class);assertThatThrownBy(()->aggregates.load(new ForecastInput(LocalDate.parse("2020-01-01"),LocalDate.parse("2026-10-21"),7))).isInstanceOf(BusinessException.class);}
    @ParameterizedTest @EnumSource(AccountService.Role.class) void endpointIsReadAnalysisWithRoleAndCsrfEnforced(AccountService.Role role) throws Exception {mvc.perform(post("/api/v1/analytics/forecast").with(user("admin@nexus.demo").roles(role.name())).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(input()))).andExpect(role==AccountService.Role.VIEWER?status().isForbidden():status().isOk());}
    @Test void storedSnapshotsSurviveChangingBusinessDataAndHaveStableFingerprint() {
        var payload=aggregates.load(input());var output=client.forecast(payload);var first=runs.save(payload,output);var second=runs.save(payload,output);
        assertThat(runs.get(first.runId()).method()).isEqualTo(output.method());assertThat(runs.latest()).hasSize(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(DISTINCT source_fingerprint) FROM analytics_runs",Long.class)).isEqualTo(1);
        jdbc.update("UPDATE products SET name='Renombrado' WHERE sku='DEMO-001'");assertThat(runs.get(first.runId()).runId()).isEqualTo(first.runId());
        assertThatThrownBy(()->jdbc.update("DELETE FROM analytics_runs WHERE id=?",second.runId())).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
    @Test void csrfAndAnonymousBypassAreRejected() throws Exception {mvc.perform(post("/api/v1/analytics/forecast").with(user("fixture").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(input()))).andExpect(status().isForbidden());mvc.perform(post("/api/v1/analytics/forecast").with(anonymous()).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(input()))).andExpect(status().isUnauthorized());}
}

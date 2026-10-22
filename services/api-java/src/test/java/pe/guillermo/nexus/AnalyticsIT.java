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
    @Autowired AnalyticsAggregates aggregates;@Autowired DemoDatasetService seed;@Autowired AccountService accounts;@Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;@Autowired com.fasterxml.jackson.databind.ObjectMapper json;@Autowired OperationsService operations;
    @MockitoBean AnalyticsClient client;
    @BeforeEach void data(){if(!accounts.exists("admin@nexus.demo"))accounts.create(new AccountService.NewAccount("Demo ADMIN","admin@nexus.demo","analytics_test_fixture_password_2026",AccountService.Role.ADMIN));seed.seed();SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin@nexus.demo",null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));}
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
    @ParameterizedTest @EnumSource(AccountService.Role.class) void endpointIsReadAnalysisWithRoleAndCsrfEnforced(AccountService.Role role) throws Exception {mvc.perform(post("/api/v1/analytics/forecast").with(user("fixture").roles(role.name())).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(input()))).andExpect(role==AccountService.Role.VIEWER?status().isForbidden():status().isOk());}
    @Test void csrfAndAnonymousBypassAreRejected() throws Exception {mvc.perform(post("/api/v1/analytics/forecast").with(user("fixture").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(input()))).andExpect(status().isForbidden());mvc.perform(post("/api/v1/analytics/forecast").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(input()))).andExpect(status().isUnauthorized());}
}

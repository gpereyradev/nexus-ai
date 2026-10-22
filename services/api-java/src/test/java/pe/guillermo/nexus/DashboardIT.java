package pe.guillermo.nexus;
import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import pe.guillermo.nexus.auth.AccountService;
import pe.guillermo.nexus.operations.*;
import pe.guillermo.nexus.reporting.DashboardService;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc @TestInstance(TestInstance.Lifecycle.PER_CLASS) @Transactional
class DashboardIT {
    @Autowired DemoDatasetService seed;
    @Autowired DashboardService reports;
    @Autowired AccountService accounts;
    @Autowired OperationsService operations;
    @Autowired JdbcTemplate jdbc;
    @BeforeAll void account() { if(!accounts.exists("admin@nexus.demo")) accounts.create(new AccountService.NewAccount("Demo ADMIN","admin@nexus.demo","report_test_fixture_password_2026",AccountService.Role.ADMIN)); }
    @BeforeEach void setup() { SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin@nexus.demo",null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));seed.seed(); }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void dashboardMatchesIndependentSqlAndAllBreakdowns() {
        var report=reports.summary(LocalDate.parse("2026-07-01"),LocalDate.parse("2026-10-21"));
        assertThat(report.orders()).isEqualTo(226);assertThat(report.daily()).hasSize(113);assertThat(report.lowStockCount()).isEqualTo(3);assertThat(report.demoData()).isTrue();
        BigDecimal sql=jdbc.queryForObject("SELECT SUM(total) FROM sales WHERE code LIKE 'DEMO-%' AND status='CONFIRMED'",BigDecimal.class);
        assertThat(report.salesTotal()).isEqualByComparingTo(sql);
        assertThat(report.daily().stream().map(DashboardService.Day::total).reduce(BigDecimal.ZERO,BigDecimal::add)).isEqualByComparingTo(sql);
        assertThat(report.categories().stream().map(DashboardService.CategoryAmount::total).reduce(BigDecimal.ZERO,BigDecimal::add)).isEqualByComparingTo(sql);
        assertThat(report.daily().stream().mapToLong(DashboardService.Day::orders).sum()).isEqualTo(report.orders());
    }
    @Test void cancelledSalesAreExcludedAndHistoricalTotalsRemainTraceable() {
        var before=reports.summary(LocalDate.parse("2026-07-01"),LocalDate.parse("2026-10-21"));
        var id=jdbc.queryForObject("SELECT id FROM sales WHERE code='DEMO-2026-000001'",java.util.UUID.class);
        BigDecimal cancelled=operations.sale(id).total();operations.cancel(id,new OperationDtos.CancellationInput("Prueba de reporte"));
        var after=reports.summary(LocalDate.parse("2026-07-01"),LocalDate.parse("2026-10-21"));
        assertThat(after.orders()).isEqualTo(before.orders()-1);assertThat(after.salesTotal()).isEqualByComparingTo(before.salesTotal().subtract(cancelled));
        assertThat(operations.sale(id).total()).isEqualByComparingTo(cancelled);assertThat(operations.sale(id).status()).isEqualTo("CANCELLED");
    }
    @Test void emptyPeriodIsZeroAndInvalidRangesAreRejected() {
        var empty=reports.summary(LocalDate.parse("2020-01-01"),LocalDate.parse("2020-01-07"));
        assertThat(empty.salesTotal()).isEqualByComparingTo("0.00");assertThat(empty.averageTicket()).isEqualByComparingTo("0.00");assertThat(empty.orders()).isZero();assertThat(empty.daily()).hasSize(7);
        assertThatThrownBy(()->reports.summary(LocalDate.parse("2026-10-22"),LocalDate.parse("2026-10-21"))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->reports.summary(LocalDate.parse("2020-01-01"),LocalDate.parse("2026-10-21"))).isInstanceOf(BusinessException.class);
    }
}

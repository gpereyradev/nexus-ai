package pe.guillermo.nexus;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import pe.guillermo.nexus.auth.AccountService;
import pe.guillermo.nexus.operations.DemoDatasetService;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"nexus.analytics.enabled=true","nexus.analytics.url=http://127.0.0.1:1","nexus.analytics.key=resilience_fixture_key_at_least_32_characters"})
@AutoConfigureMockMvc @Transactional
class AnalyticsResilienceIT {
    @Autowired DemoDatasetService seed;@Autowired AccountService accounts;@Autowired MockMvc mvc;@Autowired JdbcTemplate jdbc;
    @Test void unavailablePythonDoesNotBlockAtomicSales() throws Exception {
        if(!accounts.exists("admin@nexus.demo"))accounts.create(new AccountService.NewAccount("Demo ADMIN","admin@nexus.demo","resilience_fixture_password_2026",AccountService.Role.ADMIN));seed.seed();
        mvc.perform(post("/api/v1/analytics/forecast").with(user("admin@nexus.demo").roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"from\":\"2026-07-01\",\"to\":\"2026-10-21\",\"forecastHorizonDays\":7}")).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("ANALYTICS_UNAVAILABLE"));
        UUID product=jdbc.queryForObject("SELECT id FROM products WHERE sku='DEMO-004'",UUID.class);long before=jdbc.queryForObject("SELECT stock FROM inventory_balances WHERE id=?",Long.class,product);
        mvc.perform(post("/api/v1/sales").with(user("admin@nexus.demo").roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"customerId\":null,\"items\":[{\"productId\":\""+product+"\",\"quantity\":1}],\"requestKey\":\""+UUID.randomUUID()+"\"}")).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("SELECT stock FROM inventory_balances WHERE id=?",Long.class,product)).isEqualTo(before-1);
        mvc.perform(get("/api/v1/health")).andExpect(status().isOk());
    }
}

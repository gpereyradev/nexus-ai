package pe.guillermo.nexus.system;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.guillermo.nexus.config.SecurityConfig;
@WebMvcTest(controllers = HealthController.class, excludeAutoConfiguration = org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class)
@Import(SecurityConfig.class)
class HealthControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean HealthService health;
    @Test void publicHealthReturnsContract() throws Exception {
        when(health.check()).thenReturn(new HealthService.HealthResponse("UP", "nexus-api", "0.4.0", "F4", "UP", "PEN", "America/Lima", Instant.parse("2026-10-22T10:00:00Z")));
        mvc.perform(get("/api/v1/health")).andExpect(status().isOk()).andExpect(jsonPath("$.database").value("UP")).andExpect(jsonPath("$.currency").value("PEN"));
    }
    @Test void databaseFailureDoesNotLeakDetails() throws Exception {
        when(health.check()).thenThrow(new DataAccessResourceFailureException("sensitive connection string"));
        mvc.perform(get("/api/v1/health")).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("DATABASE_UNAVAILABLE")).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("sensitive"))));
    }
    @Test void operationalRoutesAreClosed() throws Exception {
        mvc.perform(get("/api/v1/products")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }
    @Test void mutationsCannotUseHealthException() throws Exception {
        mvc.perform(post("/api/v1/health")).andExpect(status().isForbidden());
    }
}

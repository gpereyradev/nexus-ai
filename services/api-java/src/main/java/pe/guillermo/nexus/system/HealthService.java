package pe.guillermo.nexus.system;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
@Service
public class HealthService {
    private final JdbcTemplate jdbc;
    public HealthService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @org.springframework.beans.factory.annotation.Value("${nexus.demo.data-enabled:false}")
    private boolean demoDataEnabled;
    public HealthResponse check() {
        jdbc.queryForObject("SELECT 1", Integer.class);
        if (demoDataEnabled && !Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM demo_seed_runs WHERE code='retail-v1')", Boolean.class)))
            throw new pe.guillermo.nexus.operations.BusinessException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"INITIALIZING","Preparando los datos ficticios de demostración.");
        return new HealthResponse("UP", "nexus-api", "0.3.0", "F3", "UP", "PEN", "America/Lima", Instant.now());
    }
    public record HealthResponse(String status, String application, String version, String phase,
        String database, String currency, String timezone, Instant checkedAt) {}
}

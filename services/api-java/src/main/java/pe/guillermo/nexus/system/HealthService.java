package pe.guillermo.nexus.system;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
@Service
public class HealthService {
    private final JdbcTemplate jdbc;
    public HealthService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public HealthResponse check() {
        jdbc.queryForObject("SELECT 1", Integer.class);
        return new HealthResponse("UP", "nexus-api", "0.2.0", "F1", "UP", "PEN", "America/Lima", Instant.now());
    }
    public record HealthResponse(String status, String application, String version, String phase,
        String database, String currency, String timezone, Instant checkedAt) {}
}

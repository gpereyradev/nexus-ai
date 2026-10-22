package pe.guillermo.nexus.system;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
public class HealthController {
    private final HealthService health;
    public HealthController(HealthService health) { this.health = health; }
    @GetMapping("/api/v1/health")
    public HealthService.HealthResponse health() { return health.check(); }
    @ExceptionHandler(DataAccessException.class)
    public ProblemDetail unavailable(DataAccessException exception) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, "La base de datos no está disponible.");
        detail.setTitle("Servicio no disponible"); detail.setProperty("code", "DATABASE_UNAVAILABLE");
        return detail;
    }
}

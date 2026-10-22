package pe.guillermo.nexus.analytics;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import static pe.guillermo.nexus.analytics.AnalyticsDtos.*;
@RestController @RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final AnalyticsService service;
    public AnalyticsController(AnalyticsService service){this.service=service;}
    @PostMapping("/forecast") public ForecastResult forecast(@Valid @RequestBody ForecastInput input){return service.forecast(input);}
}

package pe.guillermo.nexus.analytics;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import static pe.guillermo.nexus.analytics.AnalyticsDtos.*;
@RestController @RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final AnalyticsService service;
    private final AnalyticsRuns runs;
    public AnalyticsController(AnalyticsService service,AnalyticsRuns runs){this.service=service;this.runs=runs;}
    @PostMapping("/forecast") public ForecastResult forecast(@Valid @RequestBody ForecastInput input){return service.forecast(input);}
    @GetMapping("/runs") public java.util.List<RunSummary> runs(){return runs.latest();}
    @GetMapping("/runs/{id}") public ForecastResult run(@PathVariable java.util.UUID id){return runs.get(id);}
}

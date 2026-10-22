package pe.guillermo.nexus.analytics;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import static pe.guillermo.nexus.analytics.AnalyticsDtos.*;
@Service
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','ANALYST')")
public class AnalyticsService {
    private final AnalyticsAggregates aggregates;
    private final AnalyticsClient client;
    private final AnalyticsRuns runs;
    public AnalyticsService(AnalyticsAggregates aggregates,AnalyticsClient client,AnalyticsRuns runs){this.aggregates=aggregates;this.client=client;this.runs=runs;}
    // Aggregate transaction ends before waiting on Python; sales never call this service.
    public ForecastResult forecast(ForecastInput input){var payload=aggregates.load(input);return runs.save(payload,client.forecast(payload));}
}

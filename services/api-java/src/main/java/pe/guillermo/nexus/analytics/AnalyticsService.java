package pe.guillermo.nexus.analytics;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import static pe.guillermo.nexus.analytics.AnalyticsDtos.*;
@Service
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','ANALYST')")
public class AnalyticsService {
    private final AnalyticsAggregates aggregates;
    private final AnalyticsClient client;
    public AnalyticsService(AnalyticsAggregates aggregates,AnalyticsClient client){this.aggregates=aggregates;this.client=client;}
    // Aggregate transaction ends before waiting on Python; sales never call this service.
    public ForecastResult forecast(ForecastInput input){return client.forecast(aggregates.load(input));}
}

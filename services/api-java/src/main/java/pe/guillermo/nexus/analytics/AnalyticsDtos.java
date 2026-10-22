package pe.guillermo.nexus.analytics;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
public final class AnalyticsDtos {
    private AnalyticsDtos() {}
    public record ForecastInput(@NotNull LocalDate from,@NotNull LocalDate to,@Min(1) @Max(14) int forecastHorizonDays) {}
    public record Day(LocalDate date,@JsonSerialize(using=ToStringSerializer.class) BigDecimal value) {}
    public record Product(UUID id,String sku,String name,long stock,int minStock,long unitsSold) {}
    public record Payload(int forecastHorizonDays,List<Day> series,List<Product> products,long productCount,int demandWindowDays,boolean demoData,Instant stockAsOf) {}
    public record Point(LocalDate date,String value) {}
    public record Period(LocalDate from,LocalDate to,int days,int nonzeroDays) {}
    public record Evaluation(LocalDate selectionFrom,LocalDate selectionTo,LocalDate testFrom,LocalDate testTo,LocalDate fitTo,int sampleSize,String selectionBaselineMAE,String selectionCandidateMAE,String baselineMAE,String candidateMAE,String mae,String candidateMethod,int minimumImprovementPercent) {}
    public record Summary(String total,String dailyAverage,String minimum,String maximum) {}
    public record Anomaly(LocalDate date,String value,String reference,String threshold,String reason) {}
    public record Replenishment(UUID id,String sku,String name,long stock,int minStock,long unitsSold,String dailyUnits,String coverageDays,long targetUnits,long suggestedUnits) {}
    public record ForecastResult(String metric,int forecastHorizonDays,String method,String methodVersion,String currency,String timezone,Instant generatedAt,boolean demoData,Instant stockAsOf,Period trainingPeriod,Evaluation evaluation,List<Point> history,List<Point> predictions,Summary summary,List<Anomaly> anomalies,List<Replenishment> replenishment,List<String> warnings) {}
}

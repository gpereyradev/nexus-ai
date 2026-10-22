package pe.guillermo.nexus.analytics;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import pe.guillermo.nexus.operations.BusinessException;
import static pe.guillermo.nexus.analytics.AnalyticsDtos.*;
@Service
public class AnalyticsAggregates {
    private static final ZoneId LIMA=ZoneId.of("America/Lima");
    private final JdbcTemplate jdbc;
    public AnalyticsAggregates(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Payload load(ForecastInput input) {
        LocalDate from=input.from(),to=input.to();
        if(from==null || to==null || to.isBefore(from) || ChronoUnit.DAYS.between(from,to)>365 || !to.isBefore(LocalDate.now(LIMA)) || input.forecastHorizonDays()<1 || input.forecastHorizonDays()>14)
            throw BusinessException.invalid("Elige entre 1 y 366 días completos hasta ayer, y un horizonte de 1 a 14 días.");
        Timestamp start=Timestamp.from(from.atStartOfDay(LIMA).toInstant()),end=Timestamp.from(to.plusDays(1).atStartOfDay(LIMA).toInstant());
        var found=jdbc.query("SELECT (occurred_at AT TIME ZONE 'America/Lima')::date AS sale_day,SUM(total) total FROM sales WHERE status='CONFIRMED' AND occurred_at>=? AND occurred_at<? GROUP BY sale_day ORDER BY sale_day",(rs,row)->new Day(rs.getObject("sale_day",LocalDate.class),rs.getBigDecimal("total")),start,end);
        var byDate=new HashMap<LocalDate,BigDecimal>();for(var d:found)byDate.put(d.date(),d.value());
        var series=new ArrayList<Day>();for(var d=from;!d.isAfter(to);d=d.plusDays(1))series.add(new Day(d,byDate.getOrDefault(d,new BigDecimal("0.00"))));
        int window=(int)Math.min(28,ChronoUnit.DAYS.between(from,to)+1);
        Timestamp demandStart=Timestamp.from(to.minusDays(window-1).atStartOfDay(LIMA).toInstant());
        var products=jdbc.query("SELECT b.id,b.sku,b.name,b.stock,b.min_stock,COALESCE(u.units,0) units FROM inventory_balances b LEFT JOIN (SELECT i.product_id,SUM(i.quantity)::BIGINT units FROM sales_items i JOIN sales s ON s.id=i.sale_id WHERE s.status='CONFIRMED' AND s.occurred_at>=? AND s.occurred_at<? GROUP BY i.product_id) u ON u.product_id=b.id WHERE b.active=true ORDER BY (b.stock<=b.min_stock) DESC,b.sku,b.id LIMIT 1000",
            (rs,row)->new Product(rs.getObject("id",UUID.class),rs.getString("sku"),rs.getString("name"),rs.getLong("stock"),rs.getInt("min_stock"),rs.getLong("units")),demandStart,end);
        long count=Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM products WHERE active=true",Long.class));
        boolean demo=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM demo_seed_runs WHERE code='retail-v1')",Boolean.class));
        // No customer, account, session, password or connection information crosses this boundary.
        return new Payload(input.forecastHorizonDays(),series,products,count,window,demo,Instant.now());
    }
}

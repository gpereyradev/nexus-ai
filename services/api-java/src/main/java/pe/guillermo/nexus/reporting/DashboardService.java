package pe.guillermo.nexus.reporting;
import java.math.*;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import pe.guillermo.nexus.operations.BusinessException;

@Service
@PreAuthorize("isAuthenticated()")
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class DashboardService {
    private static final ZoneId LIMA=ZoneId.of("America/Lima");
    private final JdbcTemplate jdbc;
    public DashboardService(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public record Day(LocalDate date,@JsonSerialize(using=ToStringSerializer.class) BigDecimal total,long orders) {}
    public record CategoryAmount(String name,@JsonSerialize(using=ToStringSerializer.class) BigDecimal total) {}
    public record TopProduct(UUID id,String sku,String name,long units,@JsonSerialize(using=ToStringSerializer.class) BigDecimal total) {}
    public record LowProduct(UUID id,String sku,String name,long stock,int minStock) {}
    public record Summary(LocalDate from,LocalDate to,String currency,String timezone,
        @JsonSerialize(using=ToStringSerializer.class) BigDecimal salesTotal,long orders,
        @JsonSerialize(using=ToStringSerializer.class) BigDecimal averageTicket,long units,long lowStockCount,
        List<Day> daily,List<CategoryAmount> categories,List<TopProduct> topProducts,List<LowProduct> lowStock,boolean demoData) {}
    public Summary summary(LocalDate requestedFrom,LocalDate requestedTo) {
        LocalDate to=requestedTo==null?LocalDate.now(LIMA):requestedTo;
        LocalDate from=requestedFrom==null?to.minusDays(29):requestedFrom;
        if(to.isBefore(from) || ChronoUnit.DAYS.between(from,to)>365) throw BusinessException.invalid("Elige un período de entre 1 y 366 días.");
        Timestamp start=Timestamp.from(from.atStartOfDay(LIMA).toInstant()),end=Timestamp.from(to.plusDays(1).atStartOfDay(LIMA).toInstant());
        var aggregate=jdbc.queryForMap("SELECT COALESCE(SUM(total),0) total,COUNT(*) orders FROM sales WHERE status='CONFIRMED' AND occurred_at>=? AND occurred_at<?",start,end);
        BigDecimal total=((BigDecimal)aggregate.get("total")).setScale(2);long orders=((Number)aggregate.get("orders")).longValue();
        BigDecimal average=orders==0?new BigDecimal("0.00"):total.divide(BigDecimal.valueOf(orders),2,RoundingMode.HALF_UP);
        String matching=" FROM sales_items i JOIN sales s ON s.id=i.sale_id WHERE s.status='CONFIRMED' AND s.occurred_at>=? AND s.occurred_at<?";
        long units=Objects.requireNonNull(jdbc.queryForObject("SELECT COALESCE(SUM(i.quantity),0)"+matching,Long.class,start,end));
        var days=jdbc.query("SELECT (occurred_at AT TIME ZONE 'America/Lima')::date AS sale_day,COALESCE(SUM(total),0) total,COUNT(*) orders FROM sales WHERE status='CONFIRMED' AND occurred_at>=? AND occurred_at<? GROUP BY sale_day ORDER BY sale_day",
            (rs,row)->new Day(rs.getObject("sale_day",LocalDate.class),rs.getBigDecimal("total"),rs.getLong("orders")),start,end);
        var byDate=new HashMap<LocalDate,Day>();for(var day:days) byDate.put(day.date(),day);
        var daily=new ArrayList<Day>();for(LocalDate date=from;!date.isAfter(to);date=date.plusDays(1)) daily.add(byDate.getOrDefault(date,new Day(date,new BigDecimal("0.00"),0)));
        var categories=jdbc.query("SELECT i.category_name,COALESCE(SUM(i.subtotal),0) total"+matching+" GROUP BY i.category_name ORDER BY total DESC,i.category_name",
            (rs,row)->new CategoryAmount(rs.getString("category_name"),rs.getBigDecimal("total")),start,end);
        var products=jdbc.query("SELECT p.id,p.sku,p.name,SUM(i.quantity) units,SUM(i.subtotal) total FROM sales_items i JOIN products p ON p.id=i.product_id JOIN sales s ON s.id=i.sale_id WHERE s.status='CONFIRMED' AND s.occurred_at>=? AND s.occurred_at<? GROUP BY p.id ORDER BY total DESC,p.sku LIMIT 5",
            (rs,row)->new TopProduct(rs.getObject("id",UUID.class),rs.getString("sku"),rs.getString("name"),rs.getLong("units"),rs.getBigDecimal("total")),start,end);
        long lowCount=Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM inventory_balances WHERE active=true AND stock<=min_stock",Long.class));
        var low=jdbc.query("SELECT id,sku,name,stock,min_stock FROM inventory_balances WHERE active=true AND stock<=min_stock ORDER BY stock-min_stock,sku LIMIT 5",
            (rs,row)->new LowProduct(rs.getObject("id",UUID.class),rs.getString("sku"),rs.getString("name"),rs.getLong("stock"),rs.getInt("min_stock")));
        boolean demo=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM demo_seed_runs WHERE code='retail-v1')",Boolean.class));
        return new Summary(from,to,"PEN","America/Lima",total,orders,average,units,lowCount,daily,categories,products,low,demo);
    }
}

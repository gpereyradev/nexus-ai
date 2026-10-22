package pe.guillermo.nexus.operations;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static pe.guillermo.nexus.operations.OperationDtos.*;

@Service
@Transactional(readOnly=true)
@PreAuthorize("isAuthenticated()")
public class OperationsService {
    private static final ZoneId LIMA=ZoneId.of("America/Lima");
    private static final String MOVEMENTS="SELECT m.*,p.sku,p.name product_name,u.display_name actor,s.code sale_code FROM stock_movements m JOIN products p ON p.id=m.product_id JOIN users u ON u.id=m.created_by LEFT JOIN sales s ON s.id=m.sale_id";
    private static final String SALES="SELECT s.*,u.display_name actor,cu.display_name cancelled_actor FROM sales s JOIN users u ON u.id=s.created_by LEFT JOIN users cu ON cu.id=s.cancelled_by";
    private final JdbcTemplate jdbc;
    public OperationsService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

    public PageView<InventoryView> inventory(String q,Boolean active,UUID category,boolean lowOnly,int page,int size) {
        var where=new Filters();
        where.search(q,"i.name","i.sku");
        if(active!=null) where.add("i.active=?",active);
        if(category!=null) where.add("i.category_id=?",category);
        if(lowOnly) where.add("i.stock<=i.min_stock");
        String from=" FROM inventory_balances i JOIN categories c ON c.id=i.category_id";
        return page("SELECT i.*,c.name category_name"+from,from,where,"i.name,i.id",page,size,(rs,row)->new InventoryView(
            uuid(rs,"id"),rs.getString("sku"),rs.getString("name"),uuid(rs,"category_id"),rs.getString("category_name"),rs.getBigDecimal("price"),rs.getInt("min_stock"),rs.getBoolean("active"),rs.getLong("stock"),rs.getLong("stock")<=rs.getInt("min_stock")));
    }

    public PageView<MovementView> movements(UUID productId,MovementType type,LocalDate from,LocalDate to,int page,int size) {
        var where=new Filters();
        if(productId!=null) where.add("m.product_id=?",productId);
        if(type!=null) where.add("m.type=?",type.name());
        where.dates("m.created_at",from,to);
        return page(MOVEMENTS,MOVEMENTS.substring(MOVEMENTS.indexOf(" FROM ")),where,"m.created_at DESC,m.id",page,size,this::movementRow);
    }

    public PageView<SaleSummary> sales(String q,SaleStatus status,UUID customer,LocalDate from,LocalDate to,int page,int size) {
        var where=new Filters();where.search(q,"s.code","s.customer_name");
        if(status!=null) where.add("s.status=?",status.name());
        if(customer!=null) where.add("s.customer_id=?",customer);
        where.dates("s.occurred_at",from,to);
        return page(SALES,SALES.substring(SALES.indexOf(" FROM ")),where,"s.occurred_at DESC,s.id",page,size,
            (rs,row)->new SaleSummary(uuid(rs,"id"),rs.getString("code"),uuid(rs,"customer_id"),rs.getString("customer_name"),rs.getBigDecimal("total"),rs.getString("status"),instant(rs,"occurred_at"),rs.getString("actor")));
    }

    public SaleView sale(UUID id) {
        var headers=jdbc.query(SALES+" WHERE s.id=?",(rs,row)->new SaleView(uuid(rs,"id"),rs.getString("code"),uuid(rs,"customer_id"),rs.getString("customer_name"),rs.getBigDecimal("total"),"PEN",rs.getString("status"),instant(rs,"occurred_at"),rs.getString("actor"),instant(rs,"cancelled_at"),rs.getString("cancelled_actor"),rs.getString("cancellation_reason"),List.of()),id);
        if(headers.isEmpty()) throw BusinessException.missing("No se encontró la venta.");
        var h=headers.get(0);
        var items=jdbc.query("SELECT * FROM sales_items WHERE sale_id=? ORDER BY sku,id",(rs,row)->new SaleItemView(uuid(rs,"id"),uuid(rs,"product_id"),rs.getString("sku"),rs.getString("product_name"),rs.getString("category_name"),rs.getInt("quantity"),rs.getBigDecimal("unit_price"),rs.getBigDecimal("unit_cost"),rs.getBigDecimal("subtotal")),id);
        return new SaleView(h.id(),h.code(),h.customerId(),h.customerName(),h.total(),h.currency(),h.status(),h.occurredAt(),h.actor(),h.cancelledAt(),h.cancelledBy(),h.cancellationReason(),items);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public Creation<MovementView> adjust(AdjustmentInput input) {
        lockTimeout();
        if(input.quantity()==null || input.quantity()==0 || input.quantity() < -1_000_000 || input.quantity()>1_000_000 || input.type()==null || input.requestKey()==null || input.productId()==null) throw BusinessException.invalid("La cantidad debe ser un entero distinto de cero y de hasta un millón de unidades.");
        String reason=reason(input.reason());
        if(input.type()==AdjustmentType.ENTRY && input.quantity()<1) throw BusinessException.invalid("Un ingreso debe tener cantidad positiva.");
        UUID actor=actor();var product=lockProduct(input.productId());
        var previous=jdbc.query(MOVEMENTS+" WHERE m.created_by=? AND m.request_key=?",this::movementRow,actor,input.requestKey());
        if(!previous.isEmpty()) {
            var m=previous.get(0);
            if(!m.productId().equals(input.productId()) || !m.type().equals(input.type().name()) || m.quantity()!=input.quantity() || !m.reason().equals(reason))
                throw BusinessException.conflict("IDEMPOTENCY_CONFLICT","Esta clave ya se utilizó para otro movimiento.");
            return new Creation<>(m,false);
        }
        if(!product.active()) throw BusinessException.invalid("No se pueden registrar movimientos manuales en un producto inactivo.");
        long before=stock(product.id());int after=SaleRules.nextStock(before,input.quantity());
        UUID id=insertMovement(product.id(),input.type().name(),input.quantity(),(int)before,after,reason,null,actor,input.requestKey(),Instant.now());
        return new Creation<>(jdbc.queryForObject(MOVEMENTS+" WHERE m.id=?",this::movementRow,id),true);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public Creation<SaleView> createSale(SaleInput input) {
        lockTimeout();
        var ordered=SaleRules.ordered(input);String hash=SaleRules.fingerprint(input);UUID actor=actor();
        UUID existing=findRequest(actor,input.requestKey(),hash);
        if(existing!=null) return new Creation<>(sale(existing),false);
        String customerName=null;
        if(input.customerId()!=null) {
            var customers=jdbc.query("SELECT name,active FROM customers WHERE id=? FOR SHARE",(rs,row)->Map.entry(rs.getString("name"),rs.getBoolean("active")),input.customerId());
            if(customers.isEmpty()) throw BusinessException.missing("No se encontró el cliente.");
            if(!customers.get(0).getValue()) throw BusinessException.invalid("Selecciona un cliente activo.");
            customerName=customers.get(0).getKey();
        }
        UUID id=UUID.randomUUID();Instant now=Instant.now();
        Long sequence=jdbc.queryForObject("SELECT nextval('sale_code_seq')",Long.class);
        String code=String.format(Locale.ROOT,"V-%d-%06d",now.atZone(LIMA).getYear(),sequence);
        int inserted=jdbc.update("INSERT INTO sales(id,code,customer_id,customer_name,total,status,occurred_at,created_by,request_key,request_hash) VALUES (?,?,?,?,0,'CONFIRMED',?,?,?,?) ON CONFLICT(created_by,request_key) DO NOTHING",
            id,code,input.customerId(),customerName,Timestamp.from(now),actor,input.requestKey(),hash);
        if(inserted==0) return new Creation<>(sale(Objects.requireNonNull(findRequest(actor,input.requestKey(),hash))),false);
        // Every writer locks products in UUID order before reading the ledger.
        var products=new LinkedHashMap<UUID,ProductSnapshot>();
        for(var line:ordered) products.put(line.productId(),lockProduct(line.productId()));
        var prepared=new ArrayList<PreparedLine>();BigDecimal total=BigDecimal.ZERO;
        for(var line:ordered) {
            var p=products.get(line.productId());
            if(!p.active()) throw BusinessException.invalid("El producto "+p.sku()+" está inactivo.");
            long before=stock(p.id());int after=SaleRules.nextStock(before,-line.quantity());
            BigDecimal subtotal=SaleRules.checkedTotal(p.price().multiply(BigDecimal.valueOf(line.quantity())));
            total=SaleRules.checkedTotal(total.add(subtotal));
            prepared.add(new PreparedLine(p,line.quantity(),(int)before,after,subtotal));
        }
        for(var line:prepared) {
            var p=line.product();
            jdbc.update("INSERT INTO sales_items(id,sale_id,product_id,sku,product_name,category_name,quantity,unit_price,unit_cost,subtotal) VALUES (?,?,?,?,?,?,?,?,?,?)",
                UUID.randomUUID(),id,p.id(),p.sku(),p.name(),p.category(),line.quantity(),p.price(),p.cost(),line.subtotal());
            insertMovement(p.id(),"SALE",-line.quantity(),line.before(),line.after(),"Venta "+code,id,actor,null,now);
        }
        jdbc.update("UPDATE sales SET total=? WHERE id=?",total,id);
        return new Creation<>(sale(id),true);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public SaleView cancel(UUID id,CancellationInput input) {
        lockTimeout();String reason=reason(input.reason());UUID actor=actor();
        var states=jdbc.query("SELECT status FROM sales WHERE id=? FOR UPDATE",(rs,row)->rs.getString("status"),id);
        if(states.isEmpty()) throw BusinessException.missing("No se encontró la venta.");
        if(states.get(0).equals("CANCELLED")) return sale(id);
        SaleView view=sale(id);var lines=view.items().stream().sorted(Comparator.comparing(x->x.productId().toString())).toList();
        for(var line:lines) lockProduct(line.productId());
        Instant now=Instant.now();
        for(var line:lines) {
            long before=stock(line.productId());int after=SaleRules.nextStock(before,line.quantity());
            insertMovement(line.productId(),"REVERSAL",line.quantity(),(int)before,after,reason,id,actor,null,now);
        }
        jdbc.update("UPDATE sales SET status='CANCELLED',cancelled_at=?,cancelled_by=?,cancellation_reason=? WHERE id=?",Timestamp.from(now),actor,reason,id);
        return sale(id);
    }

    private UUID findRequest(UUID actor,UUID key,String hash) {
        var found=jdbc.query("SELECT id,request_hash FROM sales WHERE created_by=? AND request_key=?",(rs,row)->Map.entry(uuid(rs,"id"),rs.getString("request_hash")),actor,key);
        if(found.isEmpty()) return null;
        if(!found.get(0).getValue().equals(hash)) throw BusinessException.conflict("IDEMPOTENCY_CONFLICT","Esta solicitud ya se utilizó para una venta diferente. Inicia una venta nueva.");
        return found.get(0).getKey();
    }
    private ProductSnapshot lockProduct(UUID id) {
        var found=jdbc.query("SELECT p.id,p.sku,p.name,p.active,p.price,p.cost,c.name category_name FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=? FOR UPDATE OF p",
            (rs,row)->new ProductSnapshot(uuid(rs,"id"),rs.getString("sku"),rs.getString("name"),rs.getString("category_name"),rs.getBigDecimal("price"),rs.getBigDecimal("cost"),rs.getBoolean("active")),id);
        if(found.isEmpty()) throw BusinessException.missing("No se encontró uno de los productos.");
        return found.get(0);
    }
    private long stock(UUID id) { return Objects.requireNonNull(jdbc.queryForObject("SELECT COALESCE(SUM(quantity),0) FROM stock_movements WHERE product_id=?",Long.class,id)); }
    private UUID actor() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null) throw new BusinessException(org.springframework.http.HttpStatus.UNAUTHORIZED,"UNAUTHENTICATED","Debes iniciar sesión.");
        var ids=jdbc.query("SELECT id FROM users WHERE email=? AND active=true",(rs,row)->uuid(rs,"id"),auth.getName());
        if(ids.isEmpty()) throw new BusinessException(org.springframework.http.HttpStatus.UNAUTHORIZED,"UNAUTHENTICATED","La cuenta ya no está disponible.");
        return ids.get(0);
    }
    private void lockTimeout() { jdbc.execute("SET LOCAL lock_timeout = '5s'"); }
    private static String reason(String input) {
        if(input==null || input.isBlank() || input.strip().length()>250) throw BusinessException.invalid("Indica un motivo de entre 1 y 250 caracteres.");
        return input.strip();
    }
    private UUID insertMovement(UUID product,String type,int quantity,int before,int after,String reason,UUID sale,UUID actor,UUID key,Instant time) {
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO stock_movements(id,product_id,type,quantity,stock_before,stock_after,reason,sale_id,created_by,request_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",id,product,type,quantity,before,after,reason,sale,actor,key,Timestamp.from(time));
        return id;
    }
    private MovementView movementRow(ResultSet rs,int row) throws SQLException {
        return new MovementView(uuid(rs,"id"),uuid(rs,"product_id"),rs.getString("sku"),rs.getString("product_name"),rs.getString("type"),rs.getInt("quantity"),rs.getInt("stock_before"),rs.getInt("stock_after"),rs.getString("reason"),uuid(rs,"sale_id"),rs.getString("sale_code"),uuid(rs,"created_by"),rs.getString("actor"),instant(rs,"created_at"));
    }
    private <T> PageView<T> page(String select,String from,Filters filters,String order,int page,int size,RowMapper<T> mapper) {
        if(page<0 || page>100000 || size<1 || size>100) throw BusinessException.invalid("Paginación inválida: página 0–100000, tamaño 1–100.");
        long count=Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*)"+from+filters.sql(),Long.class,filters.args.toArray()));
        var args=new ArrayList<>(filters.args);args.add(size);args.add((long)page*size);
        var items=jdbc.query(select+filters.sql()+" ORDER BY "+order+" LIMIT ? OFFSET ?",mapper,args.toArray());
        return new PageView<>(items,page,size,count,(int)((count+size-1)/size));
    }
    private static UUID uuid(ResultSet rs,String field) throws SQLException { return rs.getObject(field,UUID.class); }
    private static Instant instant(ResultSet rs,String field) throws SQLException { var value=rs.getTimestamp(field);return value==null?null:value.toInstant(); }
    private record ProductSnapshot(UUID id,String sku,String name,String category,BigDecimal price,BigDecimal cost,boolean active) {}
    private record PreparedLine(ProductSnapshot product,int quantity,int before,int after,BigDecimal subtotal) {}
    private static final class Filters {
        final List<String> clauses=new ArrayList<>();final List<Object> args=new ArrayList<>();
        void add(String sql,Object... values) { clauses.add(sql);args.addAll(Arrays.asList(values)); }
        String sql() { return clauses.isEmpty()?"":" WHERE "+String.join(" AND ",clauses); }
        void search(String q,String first,String second) {
            if(q==null || q.isBlank()) return;
            if(q.length()>160) throw BusinessException.invalid("La búsqueda admite hasta 160 caracteres.");
            String pattern="%"+q.strip().replace("!","!!").replace("%","!%").replace("_","!_")+"%";
            add("("+first+" ILIKE ? ESCAPE '!' OR "+second+" ILIKE ? ESCAPE '!')",pattern,pattern);
        }
        void dates(String field,LocalDate from,LocalDate to) {
            if(from!=null && to!=null && to.isBefore(from)) throw BusinessException.invalid("La fecha final debe ser igual o posterior a la inicial.");
            if(from!=null) add(field+">=?",Timestamp.from(from.atStartOfDay(LIMA).toInstant()));
            if(to!=null) add(field+"<?",Timestamp.from(to.plusDays(1).atStartOfDay(LIMA).toInstant()));
        }
    }
}

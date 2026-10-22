package pe.guillermo.nexus.operations;

import java.math.*;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static pe.guillermo.nexus.operations.OperationDtos.*;

/** Deterministic, explicitly fictitious data. Never updates existing business rows. */
@Service
public class DemoDatasetService {
    private static final ZoneId LIMA=ZoneId.of("America/Lima");
    private static final LocalDate START=LocalDate.of(2026,7,1),END=LocalDate.of(2026,10,21);
    private final JdbcTemplate jdbc;
    public DemoDatasetService(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Transactional public boolean seed() {
        if(jdbc.update("INSERT INTO demo_seed_runs(code) VALUES ('retail-v1') ON CONFLICT DO NOTHING")==0) return false;
        var actors=jdbc.query("SELECT id FROM users WHERE email='admin@nexus.demo' AND active=true",(rs,row)->rs.getObject("id",UUID.class));
        if(actors.isEmpty()) throw new IllegalStateException("El dataset demo necesita la cuenta admin@nexus.demo. Habilita DEMO_ENABLED o deshabilita DEMO_DATA_ENABLED.");
        UUID actor=actors.get(0);
        String[] names={"Mouse óptico","Teclado USB","Memoria USB 32 GB","Cable HDMI 2 m","Cámara web HD","Hub USB 4 puertos",
            "Engrapador","Calculadora de escritorio","Organizador de escritorio","Tijeras de oficina","Termo 750 ml","Taza cerámica","Lámpara LED","Paño de cocina",
            "Mochila urbana","Llavero metálico","Soporte de celular","Funda de laptop","Cuaderno A4","Papel A4 500 hojas","Lapiceros x6","Resaltadores x4",
            "Paño de microfibra","Jabón líquido 1 L","Alcohol gel 500 ml","Botella deportiva","Banda elástica","Toalla deportiva","Café 250 g","Galletas surtidas"};
        int[] category={1,1,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,7,7,7,8,8};
        String[] prices={"29.90","49.90","24.90","19.90","89.90","59.90","12.50","28.00","18.90","9.50","39.90","14.90","44.90","8.90","69.90","7.90","16.90","39.90","11.90","23.90","9.90","14.50","6.90","12.90","11.90","29.90","19.90","14.90","18.90","6.50"};
        var products=new ArrayList<DemoProduct>();int[] stock=new int[30];
        for(int i=0;i<30;i++) {
            UUID id=key("product:"+i),cat=UUID.fromString(String.format(Locale.ROOT,"10000000-0000-0000-0000-%012d",category[i]));
            String sku=String.format(Locale.ROOT,"DEMO-%03d",i+1),categoryName=jdbc.queryForObject("SELECT name FROM categories WHERE id=?",String.class,cat);
            BigDecimal price=new BigDecimal(prices[i]),cost=price.multiply(new BigDecimal("0.60")).setScale(2,RoundingMode.HALF_UP);
            jdbc.update("INSERT INTO products(id,sku,name,category_id,cost,price,min_stock) VALUES (?,?,?,?,?,?,?)",id,sku,names[i],cat,cost,price,5+(i%4)*5);
            products.add(new DemoProduct(id,sku,names[i],categoryName,price,cost));stock[i]=500;
            movement(id,"ENTRY",500,0,500,"Dataset ficticio: existencias iniciales",null,actor,key("opening:"+i),START.minusDays(1).atTime(12,0).atZone(LIMA).toInstant());
        }
        for(int i=0;i<20;i++) jdbc.update("INSERT INTO customers(id,name,email) VALUES (?,?,?)",key("customer:"+i),String.format(Locale.ROOT,"Cliente demo %02d",i+1),String.format(Locale.ROOT,"cliente%02d@example.invalid",i+1));
        int saleIndex=0;
        for(LocalDate day=START;!day.isAfter(END);day=day.plusDays(1)) for(int shift=0;shift<2;shift++) {
            int first=(saleIndex*7)%30,second=(first+11)%30,q1=1+(saleIndex%3),q2=1+(saleIndex%2);
            var p1=products.get(first);var p2=products.get(second);UUID sale=key("sale:"+saleIndex),customer=key("customer:"+(saleIndex%20)),request=key("sale-request:"+saleIndex);
            String code=String.format(Locale.ROOT,"DEMO-2026-%06d",saleIndex+1);
            Instant time=day.atTime(shift==0?10:16,15).atZone(LIMA).toInstant();
            BigDecimal total=p1.price().multiply(BigDecimal.valueOf(q1)).add(p2.price().multiply(BigDecimal.valueOf(q2)));
            String hash=SaleRules.fingerprint(new SaleInput(customer,List.of(new SaleLineInput(p1.id(),q1),new SaleLineInput(p2.id(),q2)),request));
            jdbc.update("INSERT INTO sales(id,code,customer_id,customer_name,total,status,occurred_at,created_by,request_key,request_hash) VALUES (?,?,?,?,?,'CONFIRMED',?,?,?,?)",sale,code,customer,String.format(Locale.ROOT,"Cliente demo %02d",saleIndex%20+1),total,Timestamp.from(time),actor,request,hash);
            line(sale,p1,q1);line(sale,p2,q2);
            movement(p1.id(),"SALE",-q1,stock[first],stock[first]-q1,"Venta ficticia "+code,sale,actor,null,time);stock[first]-=q1;
            movement(p2.id(),"SALE",-q2,stock[second],stock[second]-q2,"Venta ficticia "+code,sale,actor,null,time);stock[second]-=q2;saleIndex++;
        }
        int[] target={0,2,5};
        for(int i=0;i<3;i++) movement(products.get(i).id(),"ADJUSTMENT",target[i]-stock[i],stock[i],target[i],"Dataset ficticio: caso de stock bajo",null,actor,key("low-stock:"+i),END.atTime(18,0).atZone(LIMA).toInstant());
        return true;
    }
    private void line(UUID sale,DemoProduct p,int quantity) {
        jdbc.update("INSERT INTO sales_items(id,sale_id,product_id,sku,product_name,category_name,quantity,unit_price,unit_cost,subtotal) VALUES (?,?,?,?,?,?,?,?,?,?)",key("line:"+sale+":"+p.id()),sale,p.id(),p.sku(),p.name(),p.category(),quantity,p.price(),p.cost(),p.price().multiply(BigDecimal.valueOf(quantity)));
    }
    private void movement(UUID product,String type,int quantity,int before,int after,String reason,UUID sale,UUID actor,UUID request,Instant time) {
        jdbc.update("INSERT INTO stock_movements(id,product_id,type,quantity,stock_before,stock_after,reason,sale_id,created_by,request_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",key("movement:"+product+":"+(sale==null?request:sale)),product,type,quantity,before,after,reason,sale,actor,request,Timestamp.from(time));
    }
    private static UUID key(String value) { return UUID.nameUUIDFromBytes(("nexus-retail-v1:"+value).getBytes(StandardCharsets.UTF_8)); }
    private record DemoProduct(UUID id,String sku,String name,String category,BigDecimal price,BigDecimal cost) {}
}

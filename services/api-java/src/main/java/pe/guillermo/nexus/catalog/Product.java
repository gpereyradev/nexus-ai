package pe.guillermo.nexus.catalog;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
@Entity @Table(name="products")
public class Product {
    @Id UUID id = UUID.randomUUID();
    @Column(nullable=false,length=40) String sku;
    @Column(nullable=false,length=160) String name;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="category_id") Category category;
    @Column(nullable=false,precision=12,scale=2) BigDecimal cost;
    @Column(nullable=false,precision=12,scale=2) BigDecimal price;
    @Column(nullable=false) int minStock;
    @Column(nullable=false) boolean active = true;
    @Version long version;
    @Column(nullable=false,updatable=false) Instant createdAt = Instant.now();
    protected Product() {}
}


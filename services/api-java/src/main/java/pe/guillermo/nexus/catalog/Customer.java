package pe.guillermo.nexus.catalog;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
@Entity @Table(name="customers")
public class Customer {
    @Id UUID id = UUID.randomUUID();
    @Column(nullable=false,length=160) String name;
    @Column(length=254) String email;
    @Column(length=30) String phone;
    @Column(nullable=false) boolean active = true;
    @Version long version;
    @Column(nullable=false,updatable=false) Instant createdAt = Instant.now();
    protected Customer() {}
}


package pe.guillermo.nexus.catalog;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
@Entity @Table(name="categories")
public class Category {
    @Id UUID id = UUID.randomUUID();
    @Column(nullable=false,length=100) String name;
    @Column(nullable=false) boolean active = true;
    @Version long version;
    @Column(nullable=false,updatable=false) Instant createdAt = Instant.now();
    protected Category() {}
    public UUID getId() { return id; }
    public String getName() { return name; }
    public boolean isActive() { return active; }
}


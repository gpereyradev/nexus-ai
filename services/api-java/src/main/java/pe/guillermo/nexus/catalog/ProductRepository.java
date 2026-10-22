package pe.guillermo.nexus.catalog;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
public interface ProductRepository extends JpaRepository<Product,UUID>, JpaSpecificationExecutor<Product> {}


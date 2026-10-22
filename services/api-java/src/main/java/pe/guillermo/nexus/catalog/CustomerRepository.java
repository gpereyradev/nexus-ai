package pe.guillermo.nexus.catalog;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
public interface CustomerRepository extends JpaRepository<Customer,UUID>, JpaSpecificationExecutor<Customer> {}


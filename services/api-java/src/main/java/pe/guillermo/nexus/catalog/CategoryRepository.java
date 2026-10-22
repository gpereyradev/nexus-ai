package pe.guillermo.nexus.catalog;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
public interface CategoryRepository extends JpaRepository<Category,UUID>, JpaSpecificationExecutor<Category> {}


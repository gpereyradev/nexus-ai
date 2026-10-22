package pe.guillermo.nexus;
import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import pe.guillermo.nexus.auth.AccountService;
import pe.guillermo.nexus.operations.DemoDatasetService;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc @TestInstance(TestInstance.Lifecycle.PER_CLASS) @Transactional
class DemoDatasetIT {
    @Autowired DemoDatasetService seed;
    @Autowired AccountService accounts;
    @Autowired JdbcTemplate jdbc;
    @BeforeAll void account() {
        if(!accounts.exists("admin@nexus.demo")) accounts.create(new AccountService.NewAccount("Demo ADMIN","admin@nexus.demo","dataset_test_fixture_password_2026",AccountService.Role.ADMIN));
    }
    @Test void deterministicDatasetIsConsistentAndIdempotent() {
        assertThat(seed.seed()).isTrue();assertThat(seed.seed()).isFalse();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM products WHERE sku LIKE 'DEMO-%'",Long.class)).isEqualTo(30);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM customers WHERE email LIKE '%@example.invalid' AND name LIKE 'Cliente demo %'",Long.class)).isEqualTo(20);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales WHERE code LIKE 'DEMO-%'",Long.class)).isEqualTo(226);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales s WHERE s.code LIKE 'DEMO-%' AND s.total <> (SELECT SUM(subtotal) FROM sales_items WHERE sale_id=s.id)",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM inventory_balances WHERE sku LIKE 'DEMO-%' AND stock<0",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM inventory_balances WHERE sku LIKE 'DEMO-%' AND stock<=min_stock",Long.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT MAX(occurred_at)::date - MIN(occurred_at)::date FROM sales WHERE code LIKE 'DEMO-%'",Integer.class)).isGreaterThan(90);
    }
}

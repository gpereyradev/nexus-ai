package pe.guillermo.nexus;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import pe.guillermo.nexus.auth.AccountService;
import pe.guillermo.nexus.operations.*;
import static pe.guillermo.nexus.operations.OperationDtos.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc @TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OperationsIT {
    @Autowired OperationsService operations;
    @Autowired AccountService accounts;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    private UUID a,b;
    private static final String PASSWORD="operations_test_fixture_password_2026";
    @BeforeAll void users() {
        String database=jdbc.queryForObject("SELECT current_database()",String.class);
        if(database==null || !(database.endsWith("_test") || database.endsWith("_ci")))
            throw new IllegalStateException("OperationsIT requiere una BD aislada terminada en _test o _ci; limpia las tablas de operación.");
        for(var role:AccountService.Role.values()) if(!accounts.exists(email(role)))
            accounts.create(new AccountService.NewAccount("Ops "+role,email(role),PASSWORD,role));
    }
    @BeforeEach void fixtures() {
        authenticate(AccountService.Role.ADMIN);
        a=product("A",new BigDecimal("19.90"));b=product("B",new BigDecimal("7.50"));
        operations.adjust(new AdjustmentInput(a,AdjustmentType.ENTRY,10,"Apertura de prueba",UUID.randomUUID()));
        operations.adjust(new AdjustmentInput(b,AdjustmentType.ENTRY,1,"Apertura de prueba",UUID.randomUUID()));
    }
    @AfterEach void cleanup() {
        SecurityContextHolder.clearContext();
        jdbc.execute("TRUNCATE stock_movements,sales_items,sales");
        jdbc.update("DELETE FROM products WHERE id IN (?,?)",a,b);
    }
    @Test void successfulSaleUsesServerPricesAndPreservesHistoricalSnapshot() {
        var result=operations.createSale(input(UUID.randomUUID(),new SaleLineInput(a,2),new SaleLineInput(b,1)));
        assertThat(result.created()).isTrue();assertThat(result.value().total()).isEqualByComparingTo("47.30");
        assertThat(balance(a)).isEqualTo(8);assertThat(balance(b)).isZero();
        assertThat(jdbc.queryForObject("SELECT SUM(subtotal) FROM sales_items WHERE sale_id=?",BigDecimal.class,result.value().id())).isEqualByComparingTo(result.value().total());
        jdbc.update("UPDATE products SET price=99.99,name='Nombre cambiado' WHERE id=?",a);
        var historical=operations.sale(result.value().id()).items().stream().filter(x->x.productId().equals(a)).findFirst().orElseThrow();
        assertThat(historical.unitPrice()).isEqualByComparingTo("19.90");assertThat(historical.productName()).isEqualTo("Operación A");
    }
    @Test void insufficientLineRollsBackEntireSaleAndAllMovements() {
        assertThatThrownBy(()->operations.createSale(input(UUID.randomUUID(),new SaleLineInput(a,3),new SaleLineInput(b,2))))
            .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code).isEqualTo("INSUFFICIENT_STOCK"));
        assertThat(count("sales")).isZero();assertThat(count("sales_items")).isZero();assertThat(count("stock_movements")).isEqualTo(2);
        assertThat(balance(a)).isEqualTo(10);assertThat(balance(b)).isEqualTo(1);
    }
    @Test void manualAdjustmentRequiresReasonAndCannotMakeStockNegative() {
        assertThatThrownBy(()->operations.adjust(new AdjustmentInput(a,AdjustmentType.ADJUSTMENT,-11,"Corrección",UUID.randomUUID()))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->operations.adjust(new AdjustmentInput(a,AdjustmentType.ENTRY,1," ",UUID.randomUUID()))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->operations.adjust(new AdjustmentInput(a,AdjustmentType.ENTRY,-1,"Inválido",UUID.randomUUID()))).isInstanceOf(BusinessException.class);
        assertThat(balance(a)).isEqualTo(10);assertThat(count("stock_movements")).isEqualTo(2);
    }
    @Test void adjustmentRetriesAreIdempotentAndConflictingReuseIsRejected() {
        var request=new AdjustmentInput(a,AdjustmentType.ADJUSTMENT,-2,"Conteo de prueba",UUID.randomUUID());
        var first=operations.adjust(request);var second=operations.adjust(request);
        assertThat(second.created()).isFalse();assertThat(second.value().id()).isEqualTo(first.value().id());assertThat(balance(a)).isEqualTo(8);
        assertThatThrownBy(()->operations.adjust(new AdjustmentInput(a,AdjustmentType.ADJUSTMENT,-3,request.reason(),request.requestKey()))).isInstanceOf(BusinessException.class);
    }
    @Test void saleRetryNeverDuplicatesAndChangedPayloadIsRejected() {
        var request=input(UUID.randomUUID(),new SaleLineInput(a,2));var first=operations.createSale(request);var replay=operations.createSale(request);
        assertThat(replay.created()).isFalse();assertThat(replay.value().id()).isEqualTo(first.value().id());assertThat(count("sales")).isEqualTo(1);assertThat(balance(a)).isEqualTo(8);
        assertThatThrownBy(()->operations.createSale(input(request.requestKey(),new SaleLineInput(a,3)))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code).isEqualTo("IDEMPOTENCY_CONFLICT"));
    }
    @Test void cancellationRestoresOnceEvenForInactiveProduct() {
        var request=input(UUID.randomUUID(),new SaleLineInput(a,2),new SaleLineInput(b,1));var sale=operations.createSale(request).value();
        jdbc.update("UPDATE products SET active=false WHERE id=?",a);
        var first=operations.cancel(sale.id(),new CancellationInput("Error de registro"));
        var replay=operations.cancel(sale.id(),new CancellationInput("Otro motivo ignorado"));
        assertThat(first.status()).isEqualTo("CANCELLED");assertThat(replay.cancellationReason()).isEqualTo("Error de registro");
        assertThat(balance(a)).isEqualTo(10);assertThat(balance(b)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM stock_movements WHERE type='REVERSAL'",Long.class)).isEqualTo(2);
        assertThat(operations.createSale(request).value().status()).isEqualTo("CANCELLED");
    }
    @Test @Timeout(30) void twoConcurrentSalesCannotOversell() throws Exception {
        var outcomes=race(()->attempt(input(UUID.randomUUID(),new SaleLineInput(a,7))),()->attempt(input(UUID.randomUUID(),new SaleLineInput(a,7))));
        assertThat(outcomes).containsExactlyInAnyOrder("CREATED","INSUFFICIENT_STOCK");assertThat(balance(a)).isEqualTo(3);assertThat(count("sales")).isEqualTo(1);
    }
    @Test @Timeout(30) void simultaneousRetryCreatesExactlyOneSale() throws Exception {
        var request=input(UUID.randomUUID(),new SaleLineInput(a,2));
        var results=race(()->operations.createSale(request),()->operations.createSale(request));
        assertThat(results.get(0).value().id()).isEqualTo(results.get(1).value().id());
        assertThat(results.stream().filter(Creation::created).count()).isEqualTo(1);assertThat(balance(a)).isEqualTo(8);assertThat(count("sales")).isEqualTo(1);
    }
    @Test @Timeout(30) void inverseLineOrderDoesNotDeadlockOrCorruptStock() throws Exception {
        var results=race(()->attempt(input(UUID.randomUUID(),new SaleLineInput(a,1),new SaleLineInput(b,1))),
            ()->attempt(input(UUID.randomUUID(),new SaleLineInput(b,1),new SaleLineInput(a,1))));
        assertThat(results).containsExactlyInAnyOrder("CREATED","INSUFFICIENT_STOCK");assertThat(balance(a)).isEqualTo(9);assertThat(balance(b)).isZero();
    }
    @Test @Timeout(30) void simultaneousCancellationRestoresExactlyOnce() throws Exception {
        UUID id=operations.createSale(input(UUID.randomUUID(),new SaleLineInput(a,2))).value().id();
        var results=race(()->operations.cancel(id,new CancellationInput("Anulación A")),()->operations.cancel(id,new CancellationInput("Anulación B")));
        assertThat(results).allMatch(x->x.status().equals("CANCELLED"));assertThat(results.get(0).cancellationReason()).isEqualTo(results.get(1).cancellationReason());
        assertThat(balance(a)).isEqualTo(10);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM stock_movements WHERE type='REVERSAL'",Long.class)).isEqualTo(1);
    }
    @ParameterizedTest @EnumSource(AccountService.Role.class)
    void inventoryAndSalesAreAuthorizedAtApi(AccountService.Role role) throws Exception {
        for(String path:List.of("/inventory","/inventory/movements","/sales")) mvc.perform(get("/api/v1"+path).with(user(email(role)).roles(role.name()))).andExpect(status().isOk());
        String body="{\"productId\":\""+a+"\",\"type\":\"ENTRY\",\"quantity\":1,\"reason\":\"Prueba de permisos\",\"requestKey\":\""+UUID.randomUUID()+"\"}";
        boolean operator=role==AccountService.Role.ADMIN || role==AccountService.Role.MANAGER;
        mvc.perform(post("/api/v1/inventory/adjustments").with(user(email(role)).roles(role.name())).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().is(operator?201:403));
        String sale="{\"items\":[{\"productId\":\""+a+"\",\"quantity\":1,\"unitPrice\":\"0.01\"}],\"requestKey\":\""+UUID.randomUUID()+"\"}";
        mvc.perform(post("/api/v1/sales").with(user(email(role)).roles(role.name())).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(sale))
            .andExpect(status().is(operator?201:403));
        if(operator) assertThat(jdbc.queryForObject("SELECT total FROM sales",BigDecimal.class)).isEqualByComparingTo("19.90");
        mvc.perform(post("/api/v1/sales/"+UUID.randomUUID()+"/cancel").with(user(email(role)).roles(role.name())).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Prueba\"}"))
            .andExpect(status().is(role==AccountService.Role.ADMIN?404:403));
    }
    @Test void ledgerCannotBeEditedOrInsertedWithInventedBalance() {
        assertThatThrownBy(()->jdbc.update("UPDATE stock_movements SET reason='Cambio' WHERE product_id=?",a)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(()->jdbc.update("DELETE FROM stock_movements WHERE product_id=?",a)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        UUID actor=accounts.me(email(AccountService.Role.ADMIN)).id();
        assertThatThrownBy(()->jdbc.update("INSERT INTO stock_movements(id,product_id,type,quantity,stock_before,stock_after,reason,created_by,request_key) VALUES (?,?,'ENTRY',1,999,1000,'Saldo inventado',?,?)",UUID.randomUUID(),a,actor,UUID.randomUUID()))
            .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(balance(a)).isEqualTo(10);
    }
    @Test void filtersUseInclusiveLimaDatesAndBoundPages() throws Exception {
        UUID first=operations.createSale(input(UUID.randomUUID(),new SaleLineInput(a,1))).value().id();
        UUID second=operations.createSale(input(UUID.randomUUID(),new SaleLineInput(a,1))).value().id();
        jdbc.update("UPDATE sales SET occurred_at='2026-10-22T04:59:59Z' WHERE id=?",first);
        jdbc.update("UPDATE sales SET occurred_at='2026-10-22T05:00:00Z' WHERE id=?",second);
        var result=operations.sales("",null,null,java.time.LocalDate.parse("2026-10-22"),java.time.LocalDate.parse("2026-10-22"),0,10);
        assertThat(result.items()).extracting(SaleSummary::id).containsExactly(second);
        assertThat(operations.inventory("%",null,null,false,0,10).totalElements()).isZero();
        mvc.perform(get("/api/v1/inventory?size=101").with(user(email(AccountService.Role.VIEWER)).roles("VIEWER"))).andExpect(status().isBadRequest());
    }
    private String attempt(SaleInput input) { try { operations.createSale(input);return "CREATED"; } catch(BusinessException e) { return e.code; } }
    private <T> List<T> race(Callable<T> first,Callable<T> second) throws Exception {
        var barrier=new CyclicBarrier(2);var executor=Executors.newFixedThreadPool(2);
        try {
            var one=executor.submit(()->{authenticate(AccountService.Role.ADMIN);try{barrier.await(5,TimeUnit.SECONDS);return first.call();}finally{SecurityContextHolder.clearContext();}});
            var two=executor.submit(()->{authenticate(AccountService.Role.ADMIN);try{barrier.await(5,TimeUnit.SECONDS);return second.call();}finally{SecurityContextHolder.clearContext();}});
            return List.of(one.get(20,TimeUnit.SECONDS),two.get(20,TimeUnit.SECONDS));
        } finally { executor.shutdownNow();assertThat(executor.awaitTermination(5,TimeUnit.SECONDS)).isTrue(); }
    }
    private UUID product(String suffix,BigDecimal price) {
        UUID id=UUID.randomUUID();jdbc.update("INSERT INTO products(id,sku,name,category_id,cost,price,min_stock) VALUES (?,?,?,'10000000-0000-0000-0000-000000000001',3.00,?,5)",id,"OPS-"+suffix+"-"+id.toString().substring(0,12),"Operación "+suffix,price);return id;
    }
    private long balance(UUID id) { return Objects.requireNonNull(jdbc.queryForObject("SELECT stock FROM inventory_balances WHERE id=?",Long.class,id)); }
    private long count(String table) { return Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Long.class)); }
    private SaleInput input(UUID key,SaleLineInput... items) { return new SaleInput(null,List.of(items),key); }
    private static String email(AccountService.Role role) { return "it-ops-"+role.name().toLowerCase(Locale.ROOT)+"@nexus.demo"; }
    private static void authenticate(AccountService.Role role) { SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(email(role),null,List.of(new SimpleGrantedAuthority("ROLE_"+role.name())))); }
}

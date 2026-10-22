package pe.guillermo.nexus.catalog;
import java.util.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import static pe.guillermo.nexus.catalog.CatalogDtos.*;
@RestController @RequestMapping("/api/v1")
public class CatalogController {
    private final CatalogService service;
    public CatalogController(CatalogService service) { this.service=service; }
    @GetMapping("/products") public PageView<ProductView> products(@RequestParam(defaultValue="") String q,@RequestParam(required=false) Boolean active,
        @RequestParam(required=false) UUID category,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size,
        @RequestParam(defaultValue="name") String sort,@RequestParam(defaultValue="asc") String direction) { return service.products(q,active,category,page,size,sort,direction); }
    @GetMapping("/products/{id}") public ProductView product(@PathVariable UUID id) { return service.product(id); }
    @PostMapping("/products") @ResponseStatus(HttpStatus.CREATED) public ProductView createProduct(@Valid @RequestBody ProductInput input) { return service.saveProduct(null,input); }
    @PatchMapping("/products/{id}") public ProductView updateProduct(@PathVariable UUID id,@Valid @RequestBody ProductInput input) { return service.saveProduct(id,input); }
    @GetMapping("/categories") public List<CategoryView> categories() { return service.categories(); }
    @PostMapping("/categories") @ResponseStatus(HttpStatus.CREATED) public CategoryView createCategory(@Valid @RequestBody CategoryInput input) { return service.saveCategory(null,input); }
    @PatchMapping("/categories/{id}") public CategoryView updateCategory(@PathVariable UUID id,@Valid @RequestBody CategoryInput input) { return service.saveCategory(id,input); }
    @GetMapping("/customers") public PageView<CustomerView> customers(@RequestParam(defaultValue="") String q,@RequestParam(required=false) Boolean active,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size,@RequestParam(defaultValue="name") String sort,
        @RequestParam(defaultValue="asc") String direction) { return service.customers(q,active,page,size,sort,direction); }
    @GetMapping("/customers/{id}") public CustomerView customer(@PathVariable UUID id) { return service.customer(id); }
    @PostMapping("/customers") @ResponseStatus(HttpStatus.CREATED) public CustomerView createCustomer(@Valid @RequestBody CustomerInput input) { return service.saveCustomer(null,input); }
    @PatchMapping("/customers/{id}") public CustomerView updateCustomer(@PathVariable UUID id,@Valid @RequestBody CustomerInput input) { return service.saveCustomer(id,input); }
}

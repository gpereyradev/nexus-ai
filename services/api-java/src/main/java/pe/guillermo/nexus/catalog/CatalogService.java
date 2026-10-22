package pe.guillermo.nexus.catalog;

import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static pe.guillermo.nexus.catalog.CatalogDtos.*;

@Service @Transactional(readOnly=true) @PreAuthorize("isAuthenticated()")
public class CatalogService {
    private final ProductRepository products;
    private final CustomerRepository customers;
    private final CategoryRepository categories;
    public CatalogService(ProductRepository products,CustomerRepository customers,CategoryRepository categories) { this.products=products;this.customers=customers;this.categories=categories; }
    public PageView<ProductView> products(String q,Boolean active,UUID category,int page,int size,String sort,String direction) {
        Specification<Product> spec=search(q,active,"name","sku");
        if(category!=null) spec=spec.and((root,query,cb)->cb.equal(root.get("category").get("id"),category));
        return page(products.findAll(spec,pageable(page,size,sort,direction,Set.of("name","sku","price","createdAt"))).map(ProductView::from));
    }
    public PageView<CustomerView> customers(String q,Boolean active,int page,int size,String sort,String direction) {
        return page(customers.findAll(search(q,active,"name","email"),pageable(page,size,sort,direction,Set.of("name","createdAt"))).map(CustomerView::from));
    }
    public List<CategoryView> categories() { return categories.findAll(Sort.by("name").and(Sort.by("id"))).stream().map(CategoryView::from).toList(); }
    public ProductView product(UUID id) { return ProductView.from(find(products,id)); }
    public CustomerView customer(UUID id) { return CustomerView.from(find(customers,id)); }
    @Transactional @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ProductView saveProduct(UUID id,ProductInput input) {
        Product p=id==null?new Product():find(products,id);
        if(id!=null) version(p.version,input.version());
        Category category=find(categories,input.categoryId());
        if(!category.isActive() && (id==null || !p.category.getId().equals(category.getId()))) throw invalid("Elige una categoría activa.");
        p.sku=input.sku().strip().toUpperCase(Locale.ROOT);p.name=input.name().strip();p.category=category;
        p.cost=input.cost();p.price=input.price();p.minStock=input.minStock();p.active=input.active();
        return ProductView.from(products.saveAndFlush(p));
    }
    @Transactional @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public CustomerView saveCustomer(UUID id,CustomerInput input) {
        Customer c=id==null?new Customer():find(customers,id);
        if(id!=null) version(c.version,input.version());
        c.name=input.name().strip();c.email=optional(input.email());c.phone=optional(input.phone());c.active=input.active();
        return CustomerView.from(customers.saveAndFlush(c));
    }
    @Transactional @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public CategoryView saveCategory(UUID id,CategoryInput input) {
        Category c=id==null?new Category():find(categories,id);
        if(id!=null) version(c.version,input.version());
        c.name=input.name().strip();c.active=input.active();return CategoryView.from(categories.saveAndFlush(c));
    }
    private static <T,ID> T find(org.springframework.data.jpa.repository.JpaRepository<T,ID> repository,ID id) {
        return repository.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"No se encontró el registro."));
    }
    private static void version(long stored,Long requested) {
        if(requested==null) throw invalid("La edición requiere la versión del registro.");
        if(stored!=requested) throw new ResponseStatusException(HttpStatus.CONFLICT,"Otra persona modificó el registro. Recarga antes de editar.");
    }
    private static ResponseStatusException invalid(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
    private static String optional(String value) { return value==null || value.isBlank()?null:value.strip(); }
    private static Pageable pageable(int page,int size,String sort,String direction,Set<String> allowed) {
        if(page<0 || size<1 || size>100 || !allowed.contains(sort) || !(direction.equals("asc") || direction.equals("desc"))) throw invalid("Paginación u orden inválidos.");
        return PageRequest.of(page,size,Sort.by(direction.equals("asc")?Sort.Direction.ASC:Sort.Direction.DESC,sort).and(Sort.by("id")));
    }
    private static <T> PageView<T> page(Page<T> p) { return new PageView<>(p.getContent(),p.getNumber(),p.getSize(),p.getTotalElements(),p.getTotalPages()); }
    private static <T> Specification<T> search(String q,Boolean active,String... fields) {
        return (root,query,cb)->{
            var predicates=new ArrayList<jakarta.persistence.criteria.Predicate>();
            if(active!=null) predicates.add(cb.equal(root.get("active"),active));
            if(q!=null && !q.isBlank()) {
                if(q.length()>160) throw invalid("La búsqueda admite hasta 160 caracteres.");
                String like="%"+q.strip().toLowerCase(Locale.ROOT).replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
                predicates.add(cb.or(Arrays.stream(fields).map(f->cb.like(cb.lower(root.get(f)),like,'\\')).toArray(jakarta.persistence.criteria.Predicate[]::new)));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}

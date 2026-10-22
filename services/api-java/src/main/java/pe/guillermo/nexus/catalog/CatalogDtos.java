package pe.guillermo.nexus.catalog;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import jakarta.validation.constraints.*;
public final class CatalogDtos {
    private CatalogDtos() {}
    public record ProductInput(@NotBlank @Size(max=40) @Pattern(regexp="[A-Za-z0-9_-]+") String sku,
        @NotBlank @Size(max=160) String name,@NotNull UUID categoryId,
        @NotNull @DecimalMin("0.00") @Digits(integer=10,fraction=2) BigDecimal cost,
        @NotNull @DecimalMin("0.00") @Digits(integer=10,fraction=2) BigDecimal price,
        @NotNull @PositiveOrZero Integer minStock,@NotNull Boolean active,@PositiveOrZero Long version) {}
    public record CustomerInput(@NotBlank @Size(max=160) String name,@Email @Size(max=254) String email,
        @Size(max=30) @Pattern(regexp="^$|[+()0-9 -]{6,30}") String phone,@NotNull Boolean active,@PositiveOrZero Long version) {}
    public record CategoryInput(@NotBlank @Size(max=100) String name,@NotNull Boolean active,@PositiveOrZero Long version) {}
    public record CategoryView(UUID id,String name,boolean active,long version) {
        static CategoryView from(Category c) { return new CategoryView(c.id,c.name,c.active,c.version); }
    }
    public record ProductView(UUID id,String sku,String name,UUID categoryId,String categoryName,
        @JsonSerialize(using=ToStringSerializer.class) BigDecimal cost,
        @JsonSerialize(using=ToStringSerializer.class) BigDecimal price,int minStock,boolean active,long version) {
        static ProductView from(Product p) { return new ProductView(p.id,p.sku,p.name,p.category.getId(),p.category.getName(),p.cost,p.price,p.minStock,p.active,p.version); }
    }
    public record CustomerView(UUID id,String name,String email,String phone,boolean active,long version) {
        static CustomerView from(Customer c) { return new CustomerView(c.id,c.name,c.email,c.phone,c.active,c.version); }
    }
    public record PageView<T>(List<T> items,int page,int size,long totalElements,int totalPages) {}
}

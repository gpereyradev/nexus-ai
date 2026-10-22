package pe.guillermo.nexus.operations;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
public final class OperationDtos {
    private OperationDtos() {}
    public enum AdjustmentType { ENTRY,ADJUSTMENT }
    public enum MovementType { ENTRY,ADJUSTMENT,SALE,REVERSAL }
    public enum SaleStatus { CONFIRMED,CANCELLED }
    public record AdjustmentInput(@NotNull UUID productId,@NotNull AdjustmentType type,
        @NotNull @Min(-1000000) @Max(1000000) Integer quantity,
        @NotBlank @Size(max=250) String reason,@NotNull UUID requestKey) {}
    public record SaleLineInput(@NotNull UUID productId,@NotNull @Min(1) @Max(1000000) Integer quantity) {}
    public record SaleInput(UUID customerId,@NotEmpty @Size(max=100) List<@Valid SaleLineInput> items,@NotNull UUID requestKey) {}
    public record CancellationInput(@NotBlank @Size(max=250) String reason) {}
    public record InventoryView(UUID id,String sku,String name,UUID categoryId,String categoryName,
        @JsonSerialize(using=ToStringSerializer.class) BigDecimal price,int minStock,boolean active,long stock,boolean lowStock) {}
    public record MovementView(UUID id,UUID productId,String sku,String productName,String type,int quantity,
        int stockBefore,int stockAfter,String reason,UUID saleId,String saleCode,UUID createdBy,String actor,Instant createdAt) {}
    public record SaleSummary(UUID id,String code,UUID customerId,String customerName,
        @JsonSerialize(using=ToStringSerializer.class) BigDecimal total,String status,Instant occurredAt,String actor) {}
    public record SaleItemView(UUID id,UUID productId,String sku,String productName,String categoryName,int quantity,
        @JsonSerialize(using=ToStringSerializer.class) BigDecimal unitPrice,
        @JsonSerialize(using=ToStringSerializer.class) BigDecimal unitCost,
        @JsonSerialize(using=ToStringSerializer.class) BigDecimal subtotal) {}
    public record SaleView(UUID id,String code,UUID customerId,String customerName,
        @JsonSerialize(using=ToStringSerializer.class) BigDecimal total,String currency,String status,Instant occurredAt,
        String actor,Instant cancelledAt,String cancelledBy,String cancellationReason,List<SaleItemView> items) {}
    public record Creation<T>(T value,boolean created) {}
    public record PageView<T>(List<T> items,int page,int size,long totalElements,int totalPages) {}
}

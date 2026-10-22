package pe.guillermo.nexus.operations;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import static pe.guillermo.nexus.operations.OperationDtos.*;
@RestController @RequestMapping("/api/v1")
public class OperationsController {
    private final OperationsService service;
    public OperationsController(OperationsService service) { this.service=service; }
    @GetMapping("/inventory") public PageView<InventoryView> inventory(@RequestParam(defaultValue="") String q,@RequestParam(required=false) Boolean active,@RequestParam(required=false) UUID category,
        @RequestParam(defaultValue="false") boolean lowOnly,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size) { return service.inventory(q,active,category,lowOnly,page,size); }
    @GetMapping("/inventory/movements") public PageView<MovementView> movements(@RequestParam(required=false) UUID productId,@RequestParam(required=false) MovementType type,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size) { return service.movements(productId,type,from,to,page,size); }
    @PostMapping("/inventory/adjustments") public ResponseEntity<MovementView> adjust(@Valid @RequestBody AdjustmentInput input) {
        var result=service.adjust(input);return ResponseEntity.status(result.created()?201:200).body(result.value());
    }
    @GetMapping("/sales") public PageView<SaleSummary> sales(@RequestParam(defaultValue="") String q,@RequestParam(required=false) SaleStatus status,@RequestParam(required=false) UUID customer,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size) { return service.sales(q,status,customer,from,to,page,size); }
    @GetMapping("/sales/{id}") public SaleView sale(@PathVariable UUID id) { return service.sale(id); }
    @PostMapping("/sales") public ResponseEntity<SaleView> create(@Valid @RequestBody SaleInput input) {
        var result=service.createSale(input);return ResponseEntity.status(result.created()?201:200).body(result.value());
    }
    @PostMapping("/sales/{id}/cancel") public SaleView cancel(@PathVariable UUID id,@Valid @RequestBody CancellationInput input) { return service.cancel(id,input); }
}

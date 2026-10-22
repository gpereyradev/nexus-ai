package pe.guillermo.nexus.operations;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import static pe.guillermo.nexus.operations.OperationDtos.*;
public final class SaleRules {
    public static final BigDecimal MAX_TOTAL=new BigDecimal("9999999999.99");
    private SaleRules() {}
    public static List<SaleLineInput> ordered(SaleInput input) {
        if(input.items()==null || input.items().isEmpty() || input.items().size()>100 || input.requestKey()==null) throw BusinessException.invalid("La venta requiere entre 1 y 100 líneas y una clave de solicitud.");
        var unique=new HashSet<UUID>();
        for(var line:input.items()) {
            if(line==null || line.productId()==null || line.quantity()==null || line.quantity()<1 || line.quantity()>1_000_000) throw BusinessException.invalid("Revisa los productos y cantidades de la venta.");
            if(!unique.add(line.productId())) throw BusinessException.invalid("Cada producto debe aparecer una sola vez. Ajusta su cantidad.");
        }
        return input.items().stream().sorted(Comparator.comparing(x->x.productId().toString())).toList();
    }
    public static String fingerprint(SaleInput input) {
        StringBuilder value=new StringBuilder(input.customerId()==null?"walk-in":input.customerId().toString());
        for(var line:ordered(input)) value.append('|').append(line.productId()).append(':').append(line.quantity());
        return hash(value.toString());
    }
    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    public static int nextStock(long stock,int delta) {
        long result=stock+delta;
        if(result<0) throw BusinessException.conflict("INSUFFICIENT_STOCK","No hay stock suficiente. Actualiza el inventario y revisa las cantidades.");
        if(result>Integer.MAX_VALUE) throw BusinessException.conflict("STOCK_LIMIT","La operación supera el límite de existencias permitido.");
        return (int)result;
    }
    public static BigDecimal checkedTotal(BigDecimal total) {
        if(total.signum()<0 || total.compareTo(MAX_TOTAL)>0) throw BusinessException.invalid("El total supera el límite monetario permitido.");
        return total.setScale(2);
    }
}

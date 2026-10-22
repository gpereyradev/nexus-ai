package pe.guillermo.nexus.operations;
import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static pe.guillermo.nexus.operations.OperationDtos.*;
class SaleRulesTest {
    @Test void canonicalFingerprintIgnoresLineOrderButNotQuantities() {
        UUID a=UUID.randomUUID(),b=UUID.randomUUID(),key=UUID.randomUUID();
        var first=new SaleInput(null,List.of(new SaleLineInput(a,2),new SaleLineInput(b,3)),key);
        var reordered=new SaleInput(null,List.of(new SaleLineInput(b,3),new SaleLineInput(a,2)),UUID.randomUUID());
        assertThat(SaleRules.fingerprint(first)).isEqualTo(SaleRules.fingerprint(reordered));
        assertThat(SaleRules.fingerprint(new SaleInput(null,List.of(new SaleLineInput(a,3),new SaleLineInput(b,3)),key))).isNotEqualTo(SaleRules.fingerprint(first));
    }
    @Test void duplicatesAndInvalidQuantitiesAreRejected() {
        UUID product=UUID.randomUUID();
        assertThatThrownBy(()->SaleRules.ordered(new SaleInput(null,List.of(new SaleLineInput(product,1),new SaleLineInput(product,2)),UUID.randomUUID()))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->SaleRules.ordered(new SaleInput(null,List.of(new SaleLineInput(product,0)),UUID.randomUUID()))).isInstanceOf(BusinessException.class);
    }
    @Test void inventoryBoundsCannotOverflow() {
        assertThat(SaleRules.nextStock(3,-3)).isZero();
        assertThatThrownBy(()->SaleRules.nextStock(3,-4)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->SaleRules.nextStock(Integer.MAX_VALUE,1)).isInstanceOf(BusinessException.class);
    }
    @Test void monetaryBoundAndDecimalTotalAreExact() {
        assertThat(SaleRules.checkedTotal(new BigDecimal("19.90").multiply(BigDecimal.valueOf(3)))).isEqualByComparingTo("59.70");
        assertThatThrownBy(()->SaleRules.checkedTotal(new BigDecimal("10000000000.00"))).isInstanceOf(BusinessException.class);
    }
}

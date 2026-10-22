package pe.guillermo.nexus.operations;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
@Component @Order(20) @ConditionalOnProperty(name="nexus.demo.data-enabled",havingValue="true")
public class DemoDatasetRunner implements ApplicationRunner {
    private final DemoDatasetService dataset;
    public DemoDatasetRunner(DemoDatasetService dataset) { this.dataset=dataset; }
    @Override public void run(ApplicationArguments args) { dataset.seed(); }
}

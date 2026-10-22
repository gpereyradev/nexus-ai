package pe.guillermo.nexus.auth;
import static org.assertj.core.api.Assertions.assertThat;
import java.time.*;
import org.junit.jupiter.api.Test;
class LoginLimitFilterTest {
    @Test void limitsAttemptsPerIp() {
        var filter=new LoginLimitFilter(Clock.fixed(Instant.parse("2026-10-22T10:00:00Z"),ZoneOffset.UTC));
        for(int i=0;i<10;i++) assertThat(filter.allow("127.0.0.1")).isTrue();
        assertThat(filter.allow("127.0.0.1")).isFalse();
        assertThat(filter.allow("127.0.0.2")).isTrue();
    }
}

package pe.guillermo.nexus.config;
import java.io.IOException;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // F0: solo health es público. No existe login ni usuario por defecto.
        // CSRF continúa activo. La estrategia de sesión se define en F1.
        return http
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.GET, "/api/v1/health").permitAll().anyRequest().denyAll())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((request, response, error) -> problem(response, 401, "UNAUTHENTICATED"))
                .accessDeniedHandler((request, response, error) -> problem(response, 403, "FORBIDDEN")))
            .build();
    }
    private static void problem(HttpServletResponse response, int status, String code) throws IOException {
        response.setStatus(status);
        response.setContentType("application/problem+json");
        response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"Access denied\",\"status\":" + status + ",\"code\":\"" + code + "\"}");
    }
}

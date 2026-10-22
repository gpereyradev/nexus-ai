package pe.guillermo.nexus.config;
import java.io.IOException;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import pe.guillermo.nexus.auth.LoginLimitFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // Same-origin sessions; Spring handles fixation protection and CSRF rotation.
        return http
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.GET, "/api/v1/health", "/api/v1/auth/csrf").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/analytics/forecast").hasAnyRole("ADMIN", "MANAGER", "ANALYST")
                .requestMatchers(HttpMethod.GET, "/api/v1/dashboard/summary").authenticated()
                .requestMatchers("/api/v1/users", "/api/v1/users/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/sales/*/cancel").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/inventory", "/api/v1/inventory/movements", "/api/v1/sales", "/api/v1/sales/*").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/inventory/adjustments", "/api/v1/sales").hasAnyRole("ADMIN", "MANAGER")
                .requestMatchers(HttpMethod.GET, "/api/v1/me", "/api/v1/products", "/api/v1/products/*", "/api/v1/categories", "/api/v1/customers", "/api/v1/customers/*").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/products", "/api/v1/categories", "/api/v1/customers").hasAnyRole("ADMIN", "MANAGER")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/products/*", "/api/v1/categories/*", "/api/v1/customers/*").hasAnyRole("ADMIN", "MANAGER")
                .anyRequest().denyAll())
            .formLogin(f -> f.loginPage("/api/v1/auth/login").loginProcessingUrl("/api/v1/auth/login").usernameParameter("email")
                .successHandler((req,res,auth) -> res.setStatus(204))
                .failureHandler((req,res,error) -> problem(res,401,"INVALID_CREDENTIALS")).permitAll())
            .logout(l -> l.logoutUrl("/api/v1/auth/logout").invalidateHttpSession(true).deleteCookies("JSESSIONID")
                .logoutSuccessHandler((req,res,auth) -> res.setStatus(204)).permitAll())
            .addFilterBefore(new LoginLimitFilter(), UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(e -> e
                .authenticationEntryPoint((request, response, error) -> problem(response, 401, "UNAUTHENTICATED"))
                .accessDeniedHandler((request, response, error) -> problem(response, 403, "FORBIDDEN")))
            .build();
    }
    public static void problem(HttpServletResponse response, int status, String code) throws IOException {
        response.setStatus(status);
        response.setContentType("application/problem+json");
        response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"Access denied\",\"status\":" + status + ",\"code\":\"" + code + "\"}");
    }
}

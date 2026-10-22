package pe.guillermo.nexus.auth;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService implements UserDetailsService {
    public enum Role { ADMIN,MANAGER,ANALYST,VIEWER }
    public record Account(UUID id,String displayName,String email,String role,boolean active) {}
    public record NewAccount(@NotBlank @Size(max=100) String displayName,@NotBlank @Email @Size(max=254) String email,
        @NotBlank @Size(min=12,max=72) String password,@NotNull Role role) {
        @AssertTrue(message="La contraseña admite hasta 72 bytes UTF-8.")
        public boolean isPasswordByteLengthValid() { return password==null || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length<=72; }
    }
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    public AccountService(JdbcTemplate jdbc,PasswordEncoder encoder) { this.jdbc=jdbc;this.encoder=encoder; }
    @Override public UserDetails loadUserByUsername(String email) {
        var users=jdbc.query("SELECT u.email,u.password_hash,u.active,r.code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=?",
            (rs,row)->User.withUsername(rs.getString("email")).password(rs.getString("password_hash")).disabled(!rs.getBoolean("active")).roles(rs.getString("code")).build(),normalize(email));
        if(users.isEmpty()) throw new UsernameNotFoundException("Credenciales inválidas");
        return users.get(0);
    }
    public Account me(String email) {
        return jdbc.queryForObject("SELECT u.id,u.display_name,u.email,u.active,r.code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=?",
            (rs,row)->new Account(rs.getObject("id",UUID.class),rs.getString("display_name"),rs.getString("email"),rs.getString("code"),rs.getBoolean("active")),email);
    }
    public List<Account> list() {
        return jdbc.query("SELECT u.id,u.display_name,u.email,u.active,r.code FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.display_name LIMIT 200",
            (rs,row)->new Account(rs.getObject("id",UUID.class),rs.getString("display_name"),rs.getString("email"),rs.getString("code"),rs.getBoolean("active")));
    }
    @Transactional public Account create(NewAccount input) {
        String email=normalize(input.email());
        jdbc.update("INSERT INTO users(id,display_name,email,password_hash,role_id) VALUES (?,?,?,?,(SELECT id FROM roles WHERE code=?))",
            UUID.randomUUID(),input.displayName().strip(),email,encoder.encode(input.password()),input.role().name());
        return me(email);
    }
    public boolean exists(String email) { return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE email=?)",Boolean.class,normalize(email))); }
    private static String normalize(String email) { return email.strip().toLowerCase(Locale.ROOT); }
}

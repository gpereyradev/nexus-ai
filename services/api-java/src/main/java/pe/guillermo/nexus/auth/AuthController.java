package pe.guillermo.nexus.auth;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1")
public class AuthController {
    private final AccountService accounts;
    public AuthController(AccountService accounts) { this.accounts=accounts; }
    @GetMapping("/auth/csrf") public CsrfToken csrf(CsrfToken csrf) { return csrf; }
    @GetMapping("/me") public AccountService.Account me(Authentication auth) { return accounts.me(auth.getName()); }
    @GetMapping("/users") public List<AccountService.Account> list() { return accounts.list(); }
    @PostMapping("/users") @ResponseStatus(HttpStatus.CREATED)
    public AccountService.Account create(@Valid @RequestBody AccountService.NewAccount input) { return accounts.create(input); }
}

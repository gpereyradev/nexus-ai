package pe.guillermo.nexus.auth;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
/** Opt-in bootstrap: existing credentials are never overwritten. */
@Component @ConditionalOnProperty(name="nexus.demo.enabled",havingValue="true")
public class DemoAccounts implements ApplicationRunner {
    private final AccountService accounts;
    private final Environment environment;
    public DemoAccounts(AccountService accounts,Environment environment) { this.accounts=accounts;this.environment=environment; }
    @Override public void run(ApplicationArguments args) {
        for(var role:AccountService.Role.values()) {
            String email=role.name().toLowerCase(java.util.Locale.ROOT)+"@nexus.demo";
            if(accounts.exists(email)) continue;
            String password=environment.getProperty("DEMO_"+role.name()+"_PASSWORD");
            if(password==null || password.length()<12 || password.length()>72 || password.startsWith("CHANGE_ME"))
                throw new IllegalStateException("Configura las contraseñas demo locales con npm run setup.");
            accounts.create(new AccountService.NewAccount("Demo "+role.name(),email,password,role));
        }
    }
}

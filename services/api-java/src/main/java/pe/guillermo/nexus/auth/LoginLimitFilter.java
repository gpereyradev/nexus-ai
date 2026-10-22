package pe.guillermo.nexus.auth;

import java.io.IOException;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.guillermo.nexus.config.SecurityConfig;

/** Local single-instance limiter: 10 attempts/IP/minute, bounded memory. */
public class LoginLimitFilter extends OncePerRequestFilter {
    private final Clock clock;
    private final Map<String, Window> windows = new LinkedHashMap<>();
    private record Window(long start, int attempts) {}
    public LoginLimitFilter() { this(Clock.systemUTC()); }
    LoginLimitFilter(Clock clock) { this.clock = clock; }
    synchronized boolean allow(String ip) {
        long now=clock.millis();
        windows.entrySet().removeIf(e -> now-e.getValue().start()>=60_000);
        Window old=windows.get(ip);
        if(old==null && windows.size()>=10_000 || old!=null && old.attempts()>=10) return false;
        windows.put(ip,new Window(old==null?now:old.start(),old==null?1:old.attempts()+1));
        return true;
    }
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
        if("POST".equals(req.getMethod()) && "/api/v1/auth/login".equals(req.getServletPath())) {
            String password=req.getParameter("password"),email=req.getParameter("email");
            if(password==null || email==null || email.length()>254 || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72) {
                SecurityConfig.problem(res,401,"INVALID_CREDENTIALS");return;
            }
        }
        if("POST".equals(req.getMethod()) && "/api/v1/auth/login".equals(req.getServletPath()) && !allow(req.getRemoteAddr())) {
            res.setHeader("Retry-After","60");SecurityConfig.problem(res,429,"LOGIN_RATE_LIMIT");return;
        }
        chain.doFilter(req,res);
    }
}

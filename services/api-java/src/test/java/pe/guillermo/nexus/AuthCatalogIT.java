package pe.guillermo.nexus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import java.net.*;
import java.net.http.*;
import java.util.UUID;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import pe.guillermo.nexus.auth.AccountService;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc @TestInstance(TestInstance.Lifecycle.PER_CLASS) @Transactional
class AuthCatalogIT {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AccountService accounts;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder encoder;
    @LocalServerPort int port;
    private static final String PASSWORD="integration_fixture_password_2026";
    private static final String CATEGORY="10000000-0000-0000-0000-000000000001";
    @BeforeAll void seed() {
        for(var role:AccountService.Role.values()) {
            String email="test-"+role.name().toLowerCase()+"@nexus.demo";
            if(!accounts.exists(email)) accounts.create(new AccountService.NewAccount("Prueba "+role,email,PASSWORD,role));
        }
    }
    @Test void loginRotatesSessionAndLogoutInvalidatesCookie() throws Exception {
        var cookies=new CookieManager(null,CookiePolicy.ACCEPT_ALL);
        var client=HttpClient.newBuilder().cookieHandler(cookies).build();
        String oldToken=token(client);
        String before=cookies.getCookieStore().getCookies().get(0).getValue();
        var login=client.send(HttpRequest.newBuilder(uri("/auth/login")).header("X-CSRF-TOKEN",oldToken)
            .header("Content-Type","application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString("email=test-admin%40nexus.demo&password="+PASSWORD)).build(),HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(204);
        assertThat(cookies.getCookieStore().getCookies().get(0).getValue()).isNotEqualTo(before);
        var me=client.send(HttpRequest.newBuilder(uri("/me")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertThat(me.statusCode()).isEqualTo(200);assertThat(me.body()).contains("ADMIN").doesNotContain("password");
        String cookie=cookies.getCookieStore().getCookies().stream().map(c->c.getName()+"="+c.getValue()).reduce((a,b)->a+"; "+b).orElseThrow();
        var stale=client.send(HttpRequest.newBuilder(uri("/auth/logout")).header("X-CSRF-TOKEN",oldToken).POST(HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.ofString());
        assertThat(stale.statusCode()).isEqualTo(403);
        var logout=client.send(HttpRequest.newBuilder(uri("/auth/logout")).header("X-CSRF-TOKEN",token(client)).POST(HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.ofString());
        assertThat(logout.statusCode()).isEqualTo(204);
        var replay=HttpClient.newHttpClient().send(HttpRequest.newBuilder(uri("/me")).header("Cookie",cookie).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertThat(replay.statusCode()).isEqualTo(401);
    }
    @Test void wrongPasswordAndMissingCsrfAreRejected() throws Exception {
        mvc.perform(post("/api/v1/auth/login").with(csrf()).param("email","test-admin@nexus.demo").param("password","wrong"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        mvc.perform(post("/api/v1/auth/login").param("email","test-admin@nexus.demo").param("password",PASSWORD)).andExpect(status().isForbidden());
    }
    @ParameterizedTest @EnumSource(AccountService.Role.class)
    void allRolesReadButOnlyOperatorsWrite(AccountService.Role role) throws Exception {
        mvc.perform(get("/api/v1/categories").with(user("fixture").roles(role.name()))).andExpect(status().isOk());
        boolean operator=role==AccountService.Role.ADMIN || role==AccountService.Role.MANAGER;
        mvc.perform(post("/api/v1/categories").with(user("fixture").roles(role.name())).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Role "+role+"\",\"active\":true}"))
            .andExpect(status().is(operator?201:403));
        mvc.perform(get("/api/v1/users").with(user("fixture").roles(role.name()))).andExpect(status().is(role==AccountService.Role.ADMIN?200:403));
        mvc.perform(post("/api/v1/users").with(user("fixture").roles(role.name())).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"displayName\":\"Usuario ficticio\",\"email\":\"new-"+role+"@example.invalid\",\"password\":\""+PASSWORD+"\",\"role\":\"VIEWER\"}"))
            .andExpect(status().is(role==AccountService.Role.ADMIN?201:403));
    }
    @Test void productPersistsMoneyCategoryAndRejectsStaleEdits() throws Exception {
        var created=json.readTree(mvc.perform(post("/api/v1/products").with(user("operator").roles("MANAGER")).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content(product("it-one","Mouse","24.90",null)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.sku").value("IT-ONE")).andExpect(jsonPath("$.price").value("24.90"))
            .andExpect(jsonPath("$.categoryName").value("Tecnología")).andReturn().getResponse().getContentAsString());
        String id=created.get("id").asText();
        mvc.perform(patch("/api/v1/products/"+id).with(user("operator").roles("MANAGER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(product("IT-ONE","Mouse editado","25.00",0L))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(patch("/api/v1/products/"+id).with(user("operator").roles("MANAGER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(product("IT-ONE","Cambio obsoleto","1.00",0L))).andExpect(status().isConflict());
        mvc.perform(get("/api/v1/products/"+id).with(user("reader").roles("VIEWER"))).andExpect(jsonPath("$.name").value("Mouse editado"));
    }
    @Test void validationAndDuplicateSkuCannotCorruptData() throws Exception {
        mvc.perform(post("/api/v1/products").with(user("operator").roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(product("negative","Inválido","-2.00",null))).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.price").exists());
        mvc.perform(post("/api/v1/products").with(user("operator").roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(product("unique","Producto","2.00",null))).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/products").with(user("operator").roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(product("UNIQUE","Duplicado","2.00",null))).andExpect(status().isConflict());
    }
    @Test void customerValidationAndSoftDeactivation() throws Exception {
        mvc.perform(post("/api/v1/customers").with(user("operator").roles("MANAGER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Ficticio\",\"email\":\"bad\",\"active\":true}")).andExpect(status().isBadRequest());
        var created=json.readTree(mvc.perform(post("/api/v1/customers").with(user("operator").roles("MANAGER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Cliente ficticio\",\"email\":\"demo@example.invalid\",\"active\":true}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        mvc.perform(patch("/api/v1/customers/"+created.get("id").asText()).with(user("operator").roles("MANAGER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Cliente ficticio\",\"active\":false,\"version\":0}")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/customers?active=false&q=ficticio").with(user("reader").roles("ANALYST"))).andExpect(jsonPath("$.totalElements").value(1));
    }
    @Test void listFiltersAreBoundedAndEscaped() throws Exception {
        mvc.perform(get("/api/v1/products?size=101").with(user("reader").roles("VIEWER"))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/products?sort=password_hash").with(user("reader").roles("VIEWER"))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/products").param("q","%").with(user("reader").roles("VIEWER"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/products/"+UUID.randomUUID()).with(user("reader").roles("VIEWER"))).andExpect(status().isNotFound());
    }
    @Test void anonymousAndCsrfBypassAreRejected() throws Exception {
        mvc.perform(get("/api/v1/products")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/products").with(user("operator").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON)
            .content(product("csrf","Blocked","1.00",null))).andExpect(status().isForbidden());
    }
    @Test void demoBootstrapIsIdempotentAndPasswordsAreHashed() throws Exception {
        var env=new org.springframework.mock.env.MockEnvironment();
        for(var role:AccountService.Role.values()) env.withProperty("DEMO_"+role.name()+"_PASSWORD",PASSWORD);
        var bootstrap=new pe.guillermo.nexus.auth.DemoAccounts(accounts,env);
        bootstrap.run(new org.springframework.boot.DefaultApplicationArguments());
        String hash=jdbc.queryForObject("SELECT password_hash FROM users WHERE email='admin@nexus.demo'",String.class);
        assertThat(hash).isNotEqualTo(PASSWORD);assertThat(encoder.matches(PASSWORD,hash)).isTrue();
        env.withProperty("DEMO_ADMIN_PASSWORD","replacement_password_not_applied");
        bootstrap.run(new org.springframework.boot.DefaultApplicationArguments());
        assertThat(jdbc.queryForObject("SELECT password_hash FROM users WHERE email='admin@nexus.demo'",String.class)).isEqualTo(hash);
        mvc.perform(get("/api/v1/users").with(user("fixture").roles("ADMIN"))).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("password"))));
    }
    @Test void inactiveCategoriesAndCaseDuplicatesAreRejected() throws Exception {
        var created=json.readTree(mvc.perform(post("/api/v1/categories").with(user("fixture").roles("MANAGER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Temporal\",\"active\":false}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        mvc.perform(post("/api/v1/products").with(user("fixture").roles("MANAGER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(product("inactive","Inválido","2.00",null).replace(CATEGORY,created.get("id").asText()))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/categories").with(user("fixture").roles("MANAGER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"temporal\",\"active\":true}")).andExpect(status().isConflict());
    }
    private URI uri(String path) { return URI.create("http://127.0.0.1:"+port+"/api/v1"+path); }
    private String token(HttpClient client) throws Exception {
        var response=client.send(HttpRequest.newBuilder(uri("/auth/csrf")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);return json.readTree(response.body()).get("token").asText();
    }
    private String product(String sku,String name,String price,Long version) {
        return "{\"sku\":\""+sku+"\",\"name\":\""+name+"\",\"categoryId\":\""+CATEGORY+"\",\"cost\":\"1.00\",\"price\":\""+price+"\",\"minStock\":2,\"active\":true"+(version==null?"":",\"version\":"+version)+"}";
    }
}

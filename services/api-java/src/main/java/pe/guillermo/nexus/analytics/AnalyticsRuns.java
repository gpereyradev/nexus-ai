package pe.guillermo.nexus.analytics;
import java.time.Instant;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.guillermo.nexus.operations.*;
import static pe.guillermo.nexus.analytics.AnalyticsDtos.*;
@Service @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ANALYST')")
public class AnalyticsRuns {
    private final JdbcTemplate jdbc;private final ObjectMapper json;
    public AnalyticsRuns(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    @Transactional public ForecastResult save(Payload input,ForecastResult output){
        var ids=jdbc.query("SELECT id FROM users WHERE email=? AND active=true",(rs,n)->rs.getObject("id",UUID.class),SecurityContextHolder.getContext().getAuthentication().getName());
        if(ids.isEmpty())throw new BusinessException(org.springframework.http.HttpStatus.UNAUTHORIZED,"UNAUTHENTICATED","La cuenta ya no está disponible.");
        try {
            UUID id=UUID.randomUUID();var saved=output.withRunId(id);
            var canonical=new Payload(input.forecastHorizonDays(),input.series(),input.products(),input.productCount(),input.demandWindowDays(),input.demoData(),Instant.EPOCH);
            String snapshot=json.writeValueAsString(input),fingerprint=SaleRules.hash(json.writeValueAsString(canonical));
            jdbc.update("INSERT INTO analytics_runs(id,created_by,source_fingerprint,input_snapshot,result_snapshot) VALUES (?,?,?,?::jsonb,?::jsonb)",id,ids.get(0),fingerprint,snapshot,json.writeValueAsString(saved));
            return saved;
        }catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("No se pudo registrar el experimento.");}
    }
    @Transactional(readOnly=true) public List<RunSummary> latest(){return jdbc.query("SELECT id,created_at,result_snapshot->>'method' method,result_snapshot->'evaluation'->>'mae' mae,result_snapshot->'trainingPeriod'->>'from' first_day,result_snapshot->'trainingPeriod'->>'to' last_day,(result_snapshot->>'forecastHorizonDays')::integer horizon FROM analytics_runs ORDER BY created_at DESC,id DESC LIMIT 10",(rs,n)->new RunSummary(rs.getObject("id",UUID.class),rs.getTimestamp("created_at").toInstant(),rs.getString("method"),rs.getString("mae"),rs.getString("first_day"),rs.getString("last_day"),rs.getInt("horizon")));}
    @Transactional(readOnly=true) public ForecastResult get(UUID id){var found=jdbc.query("SELECT result_snapshot::text FROM analytics_runs WHERE id=?",(rs,n)->rs.getString(1),id);if(found.isEmpty())throw BusinessException.missing("No se encontró ese análisis.");try{return json.readValue(found.get(0),ForecastResult.class);}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("No se pudo leer el experimento.");}}
}

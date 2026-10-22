package pe.guillermo.nexus.config;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.server.ResponseStatusException;
@RestControllerAdvice
public class ApiErrors {
    private ProblemDetail problem(HttpStatusCode status,String code,String detail) {
        var p=ProblemDetail.forStatusAndDetail(status,detail);p.setTitle(code);p.setProperty("code",code);return p;
    }
    @ExceptionHandler(MethodArgumentNotValidException.class) ProblemDetail validation(MethodArgumentNotValidException e) {
        var p=problem(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Revisa los campos indicados.");
        p.setProperty("fields",e.getBindingResult().getFieldErrors().stream().collect(Collectors.toMap(f->f.getField(),f->f.getDefaultMessage()==null?"Valor inválido":f.getDefaultMessage(),(a,b)->a)));return p;
    }
    @ExceptionHandler({MethodArgumentTypeMismatchException.class,HttpMessageNotReadableException.class})
    ProblemDetail malformed(Exception e) { return problem(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","El formato de la solicitud es inválido."); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail duplicate(DataIntegrityViolationException e) { return problem(HttpStatus.CONFLICT,"DATA_CONFLICT","El SKU, correo o nombre ya existe, o la referencia no es válida."); }
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ProblemDetail concurrent(Exception e) { return problem(HttpStatus.CONFLICT,"VERSION_CONFLICT","El registro cambió. Recarga antes de guardar."); }
    @ExceptionHandler(ResponseStatusException.class)
    ProblemDetail business(ResponseStatusException e) { return problem(e.getStatusCode(),"REQUEST_REJECTED",e.getReason()); }
}

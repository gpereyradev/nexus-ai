package pe.guillermo.nexus.operations;
import org.springframework.http.HttpStatus;
public class BusinessException extends RuntimeException {
    public final HttpStatus status;
    public final String code;
    public BusinessException(HttpStatus status,String code,String message) { super(message);this.status=status;this.code=code; }
    public static BusinessException invalid(String message) { return new BusinessException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR",message); }
    public static BusinessException missing(String message) { return new BusinessException(HttpStatus.NOT_FOUND,"NOT_FOUND",message); }
    public static BusinessException conflict(String code,String message) { return new BusinessException(HttpStatus.CONFLICT,code,message); }
}

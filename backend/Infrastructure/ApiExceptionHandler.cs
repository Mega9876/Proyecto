using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace SneakZone.Api.Infrastructure;

public class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var pg = exception as PostgresException ?? exception.InnerException as PostgresException;
        var (status, detail) = exception switch
        {
            DbUpdateConcurrencyException => (409, "El registro cambió. Consulta los datos y vuelve a intentarlo."),
            _ when pg?.SqlState == PostgresErrorCodes.UniqueViolation => (409, "Ya existe un registro con esos datos únicos."),
            _ when pg?.SqlState == PostgresErrorCodes.ForeignKeyViolation => (409, "La operación entra en conflicto con registros relacionados."),
            _ when pg?.SqlState == PostgresErrorCodes.CheckViolation => (400, "Los datos incumplen una restricción de la base de datos."),
            _ when pg?.SqlState is PostgresErrorCodes.DeadlockDetected or PostgresErrorCodes.SerializationFailure
                => (409, "Conflicto entre operaciones simultáneas. Vuelve a intentarlo."),
            _ => (500, "No se pudo completar la operación.")
        };
        if (status == 500) logger.LogError(exception, "Error no controlado. TraceId {TraceId}", context.TraceIdentifier);
        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status, Title = status == 500 ? "Error interno" : "Operación rechazada",
            Detail = detail, Extensions = { ["traceId"] = context.TraceIdentifier }
        }, cancellationToken: ct);
        return true;
    }
}

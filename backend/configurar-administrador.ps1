$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot 'SneakZone.Api.csproj'
$email = Read-Host 'Correo del administrador que quieres crear'
if ([string]::IsNullOrWhiteSpace($email)) { throw 'El correo es obligatorio.' }
$securePassword = Read-Host 'Contraseña (mínimo 12 caracteres, mayúscula, minúscula, número y símbolo)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ($password.Length -lt 12 -or $password -cnotmatch '[A-Z]' -or $password -cnotmatch '[a-z]' -or $password -notmatch '[0-9]' -or $password -notmatch '[^a-zA-Z0-9]') {
        throw 'La contraseña no cumple los requisitos indicados.'
    }
    & dotnet user-secrets set 'BootstrapAdmin:Email' $email.Trim() --project $project
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo guardar el correo.' }
    & dotnet user-secrets set 'BootstrapAdmin:Password' $password --project $project
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo guardar la contraseña.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $password = $null
    $securePassword.Dispose()
}
'Configuración guardada en secretos locales. Reinicia la API para crear la cuenta y asignar el rol Administrador. Si la cuenta ya existe, conserva su contraseña actual.'

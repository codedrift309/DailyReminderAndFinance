$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$bin = "C:\Users\paras.sonawane\AppData\Local\OpenAI\Codex\runtimes\cua_node\a9ba6825a525118c\bin"
$env:PATH = "$bin;$env:PATH"
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

Write-Host "Starting backend..."
$backend = Start-Process -FilePath "dotnet" -ArgumentList "run --urls http://localhost:5139" -WorkingDirectory "$root\FinanceApi" -PassThru -WindowStyle Hidden

Write-Host "Starting frontend..."
$frontend = Start-Process -FilePath "$bin\corepack.cmd" -ArgumentList "pnpm dev" -WorkingDirectory "$root\finance-ui" -PassThru -WindowStyle Hidden

Write-Host "Backend:  http://localhost:5139 (Swagger /swagger)"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Press Ctrl+C to stop? Processes run in separate windows; close them manually."

Wait-Process -Id $backend.Id,$frontend.Id
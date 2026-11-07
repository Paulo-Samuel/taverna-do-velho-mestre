# Liga a Taverna do Velho Mestre e abre o navegador.
# Usado pelo atalho da Área de Trabalho (ou rode direto: clique com o botão direito > Executar com o PowerShell).
# Se a taverna já estiver no ar, só abre o navegador. Fechar a janela desliga a taverna.
# Tudo o que aparece nesta janela fica gravado em data\logs\atalho-<data>.log (guardado por 14 dias).

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Taverna do Velho Mestre (feche esta janela para desligar)"
Set-Location -LiteralPath $PSScriptRoot
# A taverna vive na 3300. TAVERNA_PORTA só existe para testar este script sem encostar na taverna de verdade.
$porta = 3300
if ($env:TAVERNA_PORTA -match '^\d+$') { $porta = [int]$env:TAVERNA_PORTA }
$endereco = "http://localhost:$porta/"
$semPessoa = [Console]::IsInputRedirected   # rodando por script/teste: ninguém para apertar Enter

# ---------- registro em arquivo ----------
$pastaLogs = Join-Path $PSScriptRoot "data\logs"
$log = $null
try {
  New-Item -ItemType Directory -Force -Path $pastaLogs | Out-Null
  Get-ChildItem -Path $pastaLogs -Filter "atalho-*.log" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } |
    Remove-Item -Force -ErrorAction SilentlyContinue
  $log = Join-Path $pastaLogs ("atalho-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
  Start-Transcript -Path $log -Append | Out-Null
} catch {
  $log = $null
  Write-Host "(não consegui gravar o registro em data\logs; seguindo sem ele)" -ForegroundColor DarkYellow
}

# ---------- funções ----------

# A taverna marca toda resposta com "x-taverna: 1" (src/proxy.ts). Qualquer outro programa na porta não tem isso.
function TemCabecalhoTaverna($cabecalhos) {
  if ($null -eq $cabecalhos) { return $false }
  $chaves = $null
  try { $chaves = $cabecalhos.Keys } catch { $chaves = $null }
  if ($null -eq $chaves) { try { $chaves = @($cabecalhos | ForEach-Object { $_.Key }) } catch { return $false } }
  foreach ($chave in $chaves) { if ("$chave" -ieq "x-taverna") { return $true } }
  return $false
}

function NoAr {
  try {
    $resposta = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 ($endereco + "api/rede")
    return (TemCabecalhoTaverna $resposta.Headers)
  } catch {
    # 403/404 vindos da taverna também trazem o cabeçalho; de outro programa, não.
    $respostaErro = $_.Exception.Response
    if ($null -eq $respostaErro) { return $false }
    try { return (TemCabecalhoTaverna $respostaErro.Headers) } catch { return $false }
  }
}

# Quem está escutando na porta (nome do programa e PID), ou $null se ninguém.
function QuemUsaAPorta {
  try {
    $conexao = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($null -eq $conexao) { return $null }
    $processo = Get-Process -Id $conexao.OwningProcess -ErrorAction SilentlyContinue
    $nome = if ($processo) { $processo.ProcessName } else { "programa desconhecido" }
    return "$nome (PID $($conexao.OwningProcess))"
  } catch { return $null }
}

function Parar($mensagem) {
  Get-Job -ErrorAction SilentlyContinue | Stop-Job -ErrorAction SilentlyContinue
  Write-Host ""
  Write-Host $mensagem -ForegroundColor Red
  if ($log) {
    Write-Host ""
    Write-Host "Tudo o que apareceu aqui ficou gravado em:" -ForegroundColor Yellow
    Write-Host "  $log" -ForegroundColor Yellow
    Write-Host "Mande esse arquivo para quem instalou a taverna (ele abre no Bloco de Notas quando você apertar Enter)."
  }
  if (-not $semPessoa) { Read-Host "Aperte Enter para fechar" | Out-Null }
  try { Stop-Transcript | Out-Null } catch {}
  if ($log -and -not $semPessoa -and (Test-Path -LiteralPath $log)) { Start-Process notepad.exe -ArgumentList "`"$log`"" }
  exit 1
}

# Instala as dependências com npm ci (exatamente o que está no package-lock); se o ci falhar, npm install.
# Grava o hash do package-lock em node_modules\.taverna-lock para saber, na próxima vez, se algo mudou.
$marcaLock = "node_modules\.taverna-lock"
function HashDoLock {
  if (Test-Path "package-lock.json") { return (Get-FileHash -Algorithm SHA256 "package-lock.json").Hash }
  return $null
}
function InstalarDependencias {
  if (Test-Path "package-lock.json") {
    npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      Write-Host "O npm ci não deu certo; tentando com npm install..." -ForegroundColor Yellow
      npm install --no-audit --no-fund
    }
  } else {
    npm install --no-audit --no-fund
  }
  if ($LASTEXITCODE -ne 0) { return $false }
  $hash = HashDoLock
  if ($hash -and (Test-Path "node_modules")) { Set-Content -Path $marcaLock -Value $hash -NoNewline }
  return $true
}
function DependenciasMudaram {
  if (-not (Test-Path "node_modules")) { return $true }
  $hash = HashDoLock
  if ($null -eq $hash) { return $false }
  if (-not (Test-Path $marcaLock)) { return $true }
  return ((Get-Content -Raw $marcaLock).Trim() -ne $hash)
}

# ---------- já está no ar? ----------
if (NoAr) {
  Write-Host "A taverna já está aberta. Abrindo o navegador..."
  Start-Process $endereco
  Start-Sleep -Seconds 2
  try { Stop-Transcript | Out-Null } catch {}
  exit 0
}
$ocupante = QuemUsaAPorta
if ($ocupante) {
  Parar ("A porta $porta já está sendo usada por outro programa: $ocupante. " +
    "Não é a taverna (ela não respondeu como taverna). Feche esse programa (ou a janela antiga da taverna que travou) e abra o atalho de novo.")
}

Write-Host "Acendendo as velas da taverna..." -ForegroundColor Yellow

# ---------- Node ----------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Parar "O Node.js não está instalado. Instale com: winget install OpenJS.NodeJS.LTS (e abra o atalho de novo)."
}
$versao = [int]((node -v).TrimStart("v").Split(".")[0])
if ($versao -lt 24) { Parar "A taverna precisa do Node.js 24 ou mais novo (este é o $(node -v)). Instale com: winget install OpenJS.NodeJS.LTS" }

# ---------- dependências ----------
$instalouAgora = $false
if (DependenciasMudaram) {
  if (Test-Path "node_modules") {
    Write-Host "As dependências mudaram (atualização da taverna): reinstalando (pode levar um minuto)..."
  } else {
    Write-Host "Primeira vez: instalando dependências (pode levar um minuto)..."
  }
  if (-not (InstalarDependencias)) { Parar "A instalação das dependências falhou. Confira a internet e abra o atalho de novo; se repetir, mande o registro para quem instalou." }
  $instalouAgora = $true
}
if (-not (Test-Path ".env.local") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env.local"
}

# ---------- compilação ----------
# Compila quando ainda não há build ou quando o código mudou depois dele (ex.: depois de atualizar a taverna).
# O .env.local fica de fora de propósito: o servidor lê esse arquivo ao ligar, sem precisar recompilar.
$build = ".next\BUILD_ID"
$precisaCompilar = $instalouAgora -or -not (Test-Path $build)
if (-not $precisaCompilar) {
  $dataBuild = (Get-Item $build).LastWriteTime
  $maisNovo = Get-ChildItem -Recurse -File -Path "src", "mcp" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt $dataBuild } | Select-Object -First 1
  $config = Get-ChildItem -File "package.json", "package-lock.json", "next.config.ts" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt $dataBuild } | Select-Object -First 1
  $precisaCompilar = [bool]($maisNovo -or $config)
}
if ($precisaCompilar) {
  Write-Host "Preparando a taverna (só demora quando o código muda)..."
  npm run build
  if ($LASTEXITCODE -ne 0) {
    # Quase sempre é módulo faltando depois de uma atualização: reinstala tudo e tenta mais uma vez.
    Write-Host ""
    Write-Host "A compilação falhou. Reinstalando as dependências e tentando mais uma vez..." -ForegroundColor Yellow
    if (-not (InstalarDependencias)) { Parar "A reinstalação das dependências falhou. Confira a internet e abra o atalho de novo." }
    npm run build
    if ($LASTEXITCODE -ne 0) { Parar "A compilação falhou duas vezes. Veja as mensagens acima e mande o registro para quem instalou." }
  }
}

# ---------- abre o navegador quando o servidor responder (sem travar esta janela) ----------
Start-Job -ArgumentList $endereco -ScriptBlock {
  param($url)
  for ($i = 0; $i -lt 90; $i++) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 ($url + "api/rede")
      $ehTaverna = $false
      foreach ($chave in $r.Headers.Keys) { if ("$chave" -ieq "x-taverna") { $ehTaverna = $true } }
      if ($ehTaverna) { Start-Process $url }
      break
    } catch { Start-Sleep -Milliseconds 700 }
  }
} | Out-Null

Write-Host ""
Write-Host "Taverna aberta em $endereco" -ForegroundColor Green
Write-Host "Para jogar com amigos no mesmo Wi-Fi, use o botão Convidar dentro da mesa."
Write-Host "Feche esta janela para desligar a taverna."
Write-Host ""

# O cmd junta a saída de erro à normal para esta janela guardar tudo (e o registro também).
$saida = New-Object System.Collections.Generic.List[string]
$ErrorActionPreference = "Continue"
& cmd /c "npx next start -p $porta 2>&1" | ForEach-Object { [void]$saida.Add([string]$_); Write-Host $_ }
$codigo = $LASTEXITCODE
$ErrorActionPreference = "Stop"

if ($codigo -ne 0) {
  $texto = $saida -join "`n"
  $dica = ""
  if ($texto -match "EADDRINUSE") {
    $dica = "A porta $porta está ocupada: feche a outra janela da taverna ou o programa que está usando a porta e abra o atalho de novo."
  } elseif ($texto -match "database is locked|SQLITE_BUSY") {
    $dica = "O banco está travado: feche a outra taverna aberta (ou espere um minuto) e abra o atalho de novo."
  } elseif ($texto -match "Cannot find module|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND") {
    $dica = "Falta um módulo: rode atualizar-taverna.cmd (ele reinstala tudo) e abra o atalho de novo."
  } elseif ($texto -match "Could not find a production build|\.next") {
    $dica = "A compilação está incompleta: apague a pasta .next e abra o atalho de novo."
  }
  $mensagem = "A taverna desligou com erro (código $codigo)."
  if ($dica) { $mensagem = "$mensagem`n$dica" }
  Parar $mensagem
}

try { Stop-Transcript | Out-Null } catch {}

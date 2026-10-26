# Liga a Taverna do Velho Mestre e abre o navegador.
# Usado pelo atalho da Área de Trabalho (ou rode direto: clique com o botão direito > Executar com o PowerShell).
# Se a taverna já estiver no ar, só abre o navegador. Fechar a janela desliga a taverna.

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Taverna do Velho Mestre (feche esta janela para desligar)"
Set-Location -LiteralPath $PSScriptRoot
$porta = 3300
$endereco = "http://localhost:$porta/"

function NoAr {
  try {
    Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 $endereco | Out-Null
    return $true
  } catch {
    # 403/404 também significam que o servidor respondeu
    return $null -ne $_.Exception.Response
  }
}

function Parar($mensagem) {
  Write-Host ""
  Write-Host $mensagem -ForegroundColor Red
  Read-Host "Aperte Enter para fechar"
  exit 1
}

if (NoAr) {
  Write-Host "A taverna já está aberta. Abrindo o navegador..."
  Start-Process $endereco
  Start-Sleep -Seconds 2
  exit 0
}

Write-Host "Acendendo as velas da taverna..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Parar "O Node.js não está instalado. Instale com: winget install OpenJS.NodeJS (e abra o atalho de novo)."
}
$versao = [int]((node -v).TrimStart("v").Split(".")[0])
if ($versao -lt 24) { Parar "A taverna precisa do Node.js 24 ou mais novo (este é o $(node -v))." }

if (-not (Test-Path "node_modules")) {
  Write-Host "Primeira vez: instalando dependências (pode levar um minuto)..."
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Parar "Falhou o npm install." }
}
if (-not (Test-Path ".env.local") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env.local"
}

# Compila quando ainda não há build ou quando o código mudou depois dele (ex.: depois de um git pull).
$build = ".next\BUILD_ID"
$precisaCompilar = -not (Test-Path $build)
if (-not $precisaCompilar) {
  $dataBuild = (Get-Item $build).LastWriteTime
  $maisNovo = Get-ChildItem -Recurse -File -Path "src", "mcp" | Where-Object { $_.LastWriteTime -gt $dataBuild } | Select-Object -First 1
  $config = Get-ChildItem -File "package.json", "next.config.ts", ".env.local" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt $dataBuild } | Select-Object -First 1
  $precisaCompilar = [bool]($maisNovo -or $config)
}
if ($precisaCompilar) {
  Write-Host "Preparando a taverna (só demora quando o código muda)..."
  npm run build
  if ($LASTEXITCODE -ne 0) { Parar "A compilação falhou. Veja as mensagens acima." }
}

# Abre o navegador assim que o servidor responder, sem travar esta janela.
Start-Job -ArgumentList $endereco -ScriptBlock {
  param($url)
  for ($i = 0; $i -lt 60; $i++) {
    try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 $url | Out-Null; break } catch { Start-Sleep -Milliseconds 700 }
  }
  Start-Process $url
} | Out-Null

Write-Host ""
Write-Host "Taverna aberta em $endereco" -ForegroundColor Green
Write-Host "Para jogar com amigos no mesmo Wi-Fi, use o botão Convidar dentro da mesa."
Write-Host "Feche esta janela para desligar a taverna."
Write-Host ""
npx next start -p $porta

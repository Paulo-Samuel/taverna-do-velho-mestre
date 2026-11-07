# Atualiza a Taverna do Velho Mestre: puxa a versão mais nova do GitHub, reinstala o que mudou e recompila.
# Duplo clique em atualizar-taverna.cmd (ou botão direito aqui > Executar com o PowerShell).
# A taverna precisa estar DESLIGADA (feche a janela preta dela antes).
# Tudo o que aparece nesta janela fica gravado em data\logs\atualizar-<data>.log (guardado por 14 dias).

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Atualizar a Taverna do Velho Mestre"
Set-Location -LiteralPath $PSScriptRoot
$porta = 3300
if ($env:TAVERNA_PORTA -match '^\d+$') { $porta = [int]$env:TAVERNA_PORTA }
$endereco = "http://localhost:$porta/"
$repositorio = "https://github.com/Paulo-Samuel/taverna-do-velho-mestre.git"
$semPessoa = [Console]::IsInputRedirected   # rodando por script/teste: ninguém para apertar Enter

# ---------- registro em arquivo ----------
$pastaLogs = Join-Path $PSScriptRoot "data\logs"
$log = $null
try {
  New-Item -ItemType Directory -Force -Path $pastaLogs | Out-Null
  Get-ChildItem -Path $pastaLogs -Filter "atualizar-*.log" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } |
    Remove-Item -Force -ErrorAction SilentlyContinue
  $log = Join-Path $pastaLogs ("atualizar-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
  Start-Transcript -Path $log -Append | Out-Null
} catch {
  $log = $null
}

# ---------- funções ----------
function TemCabecalhoTaverna($cabecalhos) {
  if ($null -eq $cabecalhos) { return $false }
  $chaves = $null
  try { $chaves = $cabecalhos.Keys } catch { $chaves = $null }
  if ($null -eq $chaves) { try { $chaves = @($cabecalhos | ForEach-Object { $_.Key }) } catch { return $false } }
  foreach ($chave in $chaves) { if ("$chave" -ieq "x-taverna") { return $true } }
  return $false
}

# Só é "no ar" quando quem responde é a taverna (cabeçalho x-taverna que src/proxy.ts põe em toda resposta).
function NoAr {
  try {
    $resposta = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 ($endereco + "api/rede")
    return (TemCabecalhoTaverna $resposta.Headers)
  } catch {
    $respostaErro = $_.Exception.Response
    if ($null -eq $respostaErro) { return $false }
    try { return (TemCabecalhoTaverna $respostaErro.Headers) } catch { return $false }
  }
}

function Encerrar($mensagem, $cor, $codigo) {
  Write-Host ""
  Write-Host $mensagem -ForegroundColor $cor
  if ($log -and $codigo -ne 0) {
    Write-Host ""
    Write-Host "Tudo o que apareceu aqui ficou gravado em:" -ForegroundColor Yellow
    Write-Host "  $log" -ForegroundColor Yellow
    Write-Host "Mande esse arquivo para quem instalou a taverna."
  }
  if (-not $semPessoa) { Read-Host "Aperte Enter para fechar" | Out-Null }
  try { Stop-Transcript | Out-Null } catch {}
  exit $codigo
}
function Parar($mensagem) { Encerrar $mensagem "Red" 1 }

# Roda um programa juntando a saída de erro à normal (o git fala muito pela saída de erro) e devolve o texto.
# O código de saída fica em $script:ultimoCodigo.
function Rodar($comando) {
  $anterior = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $linhas = @(& cmd /c "$comando 2>&1" | ForEach-Object { Write-Host $_; [string]$_ })
  $script:ultimoCodigo = $LASTEXITCODE
  $ErrorActionPreference = $anterior
  return ($linhas -join "`n")
}

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

# ---------- a taverna precisa estar desligada ----------
if (NoAr) {
  Parar ("A taverna está aberta agora. Feche a janela dela (a preta, com 'feche esta janela para desligar') " +
    "e rode a atualização de novo. Atualizar com ela ligada deixaria a mesa no meio de uma versão e outra.")
}

# ---------- sem .git: a pasta veio de um ZIP ----------
if (-not (Test-Path ".git")) {
  Write-Host ""
  Write-Host "Esta pasta não tem o controle de versão (.git): ela veio de um ZIP baixado, e assim não dá para puxar" -ForegroundColor Yellow
  Write-Host "as atualizações automaticamente. Para passar a receber atualizações, uma vez só:" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  1. Instale o Git (se ainda não tiver):   winget install Git.Git"
  Write-Host "     e depois feche e abra de novo o terminal (ou o Claude Code) antes de continuar."
  Write-Host "  2. Baixe a taverna com o Git numa pasta nova, fora do OneDrive:"
  Write-Host "       git clone $repositorio C:\taverna"
  Write-Host "  3. Copie desta pasta para C:\taverna:"
  Write-Host "       - a pasta data\        (suas campanhas, fichas e histórico)"
  Write-Host "       - o arquivo .env.local (suas configurações)"
  Write-Host "       - a pasta musica\      (se tiver músicas próprias)"
  Write-Host "  4. Na pasta nova, rode iniciar-taverna.cmd (ou refaça o atalho da Área de Trabalho apontando para ela)."
  Write-Host "  Daí em diante, atualizar é só dar duplo clique em atualizar-taverna.cmd."
  Write-Host ""
  Write-Host "Se preferir, peça ajuda a quem instalou a taverna: é uma mudança de cinco minutos."
  Encerrar "Nada foi alterado." "Yellow" 2
}

# ---------- com .git: puxar do GitHub ----------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Parar "O Git não está instalado (ou não está no PATH). Instale com: winget install Git.Git, feche e abra de novo o terminal e rode a atualização outra vez."
}

Write-Host "Procurando novidades no GitHub..." -ForegroundColor Yellow
$antes = (git rev-parse --short HEAD)
$saidaFetch = Rodar "git fetch --quiet"
if ($ultimoCodigo -ne 0) {
  if ($saidaFetch -match "Could not resolve host|unable to access|Failed to connect|Connection timed out|Could not resolve proxy|Network is unreachable") {
    Parar "Não consegui falar com o GitHub: parece que está sem internet (ou o GitHub está fora do ar). Confira a conexão e tente de novo."
  }
  Parar "O git fetch falhou. Veja a mensagem acima; se não fizer sentido, mande o registro para quem instalou."
}

$saidaPull = Rodar "git pull --ff-only"
if ($ultimoCodigo -ne 0) {
  $modificados = @(git status --porcelain --untracked-files=no | ForEach-Object { $_.Substring(3).Trim() })
  if ($modificados.Count -gt 0) {
    Parar ("Há alterações locais em: " + ($modificados -join ", ") + ". " +
      "A atualização não sobrescreve o que foi mexido à mão. Rode `git stash` nesta pasta (guarda as alterações de lado) e atualize de novo, ou peça ajuda a quem instalou.")
  }
  if ($saidaPull -match "Not possible to fast-forward|diverging|divergent|fatal: Need to specify how to reconcile") {
    Parar "Esta pasta tem commits próprios que não estão no GitHub, e por isso a atualização automática não dá. Peça ajuda a quem instalou (é um `git rebase` ou `git reset` rápido)."
  }
  Parar "O git pull falhou. Veja a mensagem acima; se não fizer sentido, mande o registro para quem instalou."
}
$depois = (git rev-parse --short HEAD)
if ($antes -eq $depois) {
  Write-Host "A taverna já estava na versão mais nova ($depois)." -ForegroundColor Green
} else {
  Write-Host "Atualizada de $antes para $depois." -ForegroundColor Green
}

# ---------- Node, dependências e compilação (o mesmo que o atalho faz) ----------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Parar "O Node.js não está instalado. Instale com: winget install OpenJS.NodeJS.LTS (e rode a atualização de novo)."
}
$versao = [int]((node -v).TrimStart("v").Split(".")[0])
if ($versao -lt 24) { Parar "A taverna precisa do Node.js 24 ou mais novo (este é o $(node -v)). Instale com: winget install OpenJS.NodeJS.LTS" }

$instalouAgora = $false
if (DependenciasMudaram) {
  Write-Host "Reinstalando as dependências (pode levar um minuto)..."
  if (-not (InstalarDependencias)) { Parar "A instalação das dependências falhou. Confira a internet e tente de novo; se repetir, mande o registro para quem instalou." }
  $instalouAgora = $true
}
if (-not (Test-Path ".env.local") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env.local"
}

$build = ".next\BUILD_ID"
$precisaCompilar = $instalouAgora -or ($antes -ne $depois) -or -not (Test-Path $build)
if (-not $precisaCompilar) {
  $dataBuild = (Get-Item $build).LastWriteTime
  $maisNovo = Get-ChildItem -Recurse -File -Path "src", "mcp" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt $dataBuild } | Select-Object -First 1
  $config = Get-ChildItem -File "package.json", "package-lock.json", "next.config.ts" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt $dataBuild } | Select-Object -First 1
  $precisaCompilar = [bool]($maisNovo -or $config)
}
if ($precisaCompilar) {
  Write-Host "Compilando a taverna (leva alguns minutos)..."
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "A compilação falhou. Reinstalando as dependências e tentando mais uma vez..." -ForegroundColor Yellow
    if (-not (InstalarDependencias)) { Parar "A reinstalação das dependências falhou. Confira a internet e tente de novo." }
    npm run build
    if ($LASTEXITCODE -ne 0) { Parar "A compilação falhou duas vezes. Veja as mensagens acima e mande o registro para quem instalou." }
  }
} else {
  Write-Host "Nada para recompilar."
}

Encerrar "Pronto — a taverna está atualizada. Abra o atalho de sempre para jogar." "Green" 0

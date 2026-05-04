$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Checking Node.js and npm..."
$nodeVersion = node -v
$npmVersion = npm -v
Write-Host "Node: $nodeVersion"
Write-Host "npm:  $npmVersion"

Write-Host "Installing project dependencies..."
npm install

Write-Host "Running typecheck..."
npm run typecheck

Write-Host "Running tests..."
npm run test

Write-Host "Running build..."
npm run build

$ghCandidates = @(
  "gh",
  "C:\Program Files\GitHub CLI\gh.exe"
)

$ghPath = $null
foreach ($candidate in $ghCandidates) {
  try {
    & $candidate --version | Out-Null
    $ghPath = $candidate
    break
  } catch {
  }
}

if ($ghPath) {
  Write-Host "GitHub CLI available via: $ghPath"
  try {
    & $ghPath auth status
  } catch {
    Write-Warning "GitHub CLI is installed but not authenticated. Run 'gh auth login' before pushing."
  }
} else {
  Write-Warning "GitHub CLI not found. Install it with: winget install --id GitHub.cli -e --source winget"
}

Write-Host "Machine setup complete."

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot "dist"
$defaultUrl = "https://www.google.com/maps"
$targetUrl = if ($args.Count -gt 0 -and $args[0]) { $args[0] } else { $defaultUrl }

Set-Location $projectRoot

Write-Host "Building extension..."
npm run build

Write-Host "Validating extension package..."
npm run validate:extension

$chromeCandidates = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

$chromePath = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chromePath) {
  throw "Chrome was not found. Install Google Chrome or update scripts/open-extension-dev.ps1 with the browser path."
}

$profilePath = Join-Path $env:TEMP "geo-ai-assistant-chrome-profile"
New-Item -ItemType Directory -Force -Path $profilePath | Out-Null

Write-Host "Launching Chrome with extension from: $distPath"
Write-Host "Profile: $profilePath"
Write-Host "URL: $targetUrl"

Start-Process -FilePath $chromePath -ArgumentList @(
  "--user-data-dir=$profilePath",
  "--disable-extensions-except=$distPath",
  "--load-extension=$distPath",
  "--no-first-run",
  "--no-default-browser-check",
  $targetUrl
)

Write-Host "Chrome launched. Pin or open the extension action to inspect Popup and Options."

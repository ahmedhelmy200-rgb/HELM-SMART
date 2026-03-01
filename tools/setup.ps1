param(
  [switch]$Dev
)

$ErrorActionPreference = 'Stop'

# Run from project root
Set-Location (Resolve-Path "$PSScriptRoot\..")

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js غير مثبت أو غير موجود في PATH.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm غير موجود في PATH.'
}

Write-Host '==> Installing dependencies (npm install)'
npm install

if ($Dev) {
  Write-Host '==> Starting dev server (npm run dev)'
  npm run dev
  exit 0
}

Write-Host '==> Building (npm run build)'
npm run build

Write-Host '==> Preview (npm run preview)'
npm run preview

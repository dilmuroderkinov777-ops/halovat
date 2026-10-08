$ErrorActionPreference = 'Stop'

$scriptDirectory = Get-Item -Force -LiteralPath $PSScriptRoot
$projectRoot = if ($scriptDirectory.LinkType -eq 'Junction' -and $scriptDirectory.Target) {
  $scriptDirectory.Target
} else {
  $scriptDirectory.FullName
}

$locationPushed = $false
$exitCode = 1
try {
  Push-Location $projectRoot
  $locationPushed = $true

  $sdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path $sdkPath) {
    $env:ANDROID_HOME = $sdkPath
    $env:ANDROID_SDK_ROOT = $sdkPath
    $env:PATH = "$sdkPath\platform-tools;$sdkPath\emulator;$env:PATH"
  }

  npx expo run:android
  $exitCode = $LASTEXITCODE
} finally {
  if ($locationPushed) { Pop-Location }
}

exit $exitCode

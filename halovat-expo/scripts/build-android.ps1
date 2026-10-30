param(
  [ValidateSet('test', 'production')][string]$Mode = 'test',
  [string]$Credentials = '',
  [string]$Architectures = 'arm64-v8a,x86_64',
  [switch]$SkipPrebuild
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:CI = '1'
try {
  if ($Mode -eq 'test') {
    $env:HALOVAT_TEST_BUILD = '1'
    Remove-Item Env:HALOVAT_RELEASE_STORE_FILE -ErrorAction SilentlyContinue
  } else {
    if (-not $Credentials -or -not (Test-Path -LiteralPath $Credentials)) { throw 'Pass -Credentials with the local release credentials JSON path.' }
    $signing = Get-Content -LiteralPath $Credentials -Raw | ConvertFrom-Json
    $env:HALOVAT_RELEASE_STORE_FILE = $signing.keystorePath
    $env:HALOVAT_RELEASE_STORE_PASSWORD = $signing.keystorePassword
    $env:HALOVAT_RELEASE_KEY_ALIAS = $signing.keyAlias
    $env:HALOVAT_RELEASE_KEY_PASSWORD = $signing.keyPassword
    Remove-Item Env:HALOVAT_TEST_BUILD -ErrorAction SilentlyContinue
    if (-not (Test-Path -LiteralPath $signing.keystorePath)) { throw 'Release keystore does not exist.' }
  }
  if (-not $SkipPrebuild) {
    & npx expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }
  } elseif (-not (Test-Path 'android\gradlew.bat')) { throw 'Run prebuild before using -SkipPrebuild.' }
  Push-Location (Join-Path $projectRoot 'android')
  try {
    $tasks = @(':halovat-focus:test', ':app:assembleRelease')
    if ($Mode -eq 'production') { $tasks += ':app:bundleRelease' }
    & .\gradlew.bat @tasks "-PreactNativeArchitectures=$Architectures" --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Android verification/build failed.' }
  } finally { Pop-Location }
} finally {
  foreach ($name in @('HALOVAT_TEST_BUILD','HALOVAT_RELEASE_STORE_FILE','HALOVAT_RELEASE_STORE_PASSWORD','HALOVAT_RELEASE_KEY_ALIAS','HALOVAT_RELEASE_KEY_PASSWORD')) {
    Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
  }
}

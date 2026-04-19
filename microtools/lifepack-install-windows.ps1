$ErrorActionPreference = "Stop"

$ZipUrl = "https://www.life-pack365.com/lifepack-tools.zip"
$DestDir = Join-Path $env:USERPROFILE "LifePack"
$ZipPath = Join-Path $DestDir "lifepack-tools.zip"

New-Item -ItemType Directory -Force -Path $DestDir | Out-Null

Write-Host "Downloading LifePack..."
Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath

Write-Host "Extracting..."
Expand-Archive -Force -Path $ZipPath -DestinationPath $DestDir

Write-Host "Done. Opening your app..."
Start-Process ("file:///" + (Join-Path $DestDir "index.html"))

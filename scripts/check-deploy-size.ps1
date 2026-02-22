$dir = 'C:\Users\vboxuser\openclaw\openclaw-windows\gateway-deploy\node_modules'
$files = (Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
$size = (Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "Files: $files"
Write-Host "Size: $([math]::Round($size/1MB,1)) MB"

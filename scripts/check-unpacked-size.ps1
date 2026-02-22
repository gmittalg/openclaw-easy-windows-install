$dir = 'C:\Users\vboxuser\openclaw\openclaw-windows\dist\win-unpacked'
$files = (Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
$size = (Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "Files: $files"
Write-Host "Size: $([math]::Round($size/1MB,1)) MB"

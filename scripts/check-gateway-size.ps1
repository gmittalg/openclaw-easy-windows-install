$base = 'C:\Users\vboxuser\openclaw\openclaw-windows\dist\win-unpacked\resources\gateway'
$files = (Get-ChildItem $base -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
$size = (Get-ChildItem $base -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "Gateway files: $files"
Write-Host "Gateway size: $([math]::Round($size/1MB,1)) MB"

# Top 10 largest subdirs
Get-ChildItem "$base\node_modules" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $s = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  [PSCustomObject]@{Name=$_.Name; SizeMB=[math]::Round($s/1MB,1)}
} | Sort-Object SizeMB -Descending | Select-Object -First 10 | Format-Table -AutoSize

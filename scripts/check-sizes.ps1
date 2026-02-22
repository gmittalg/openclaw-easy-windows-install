$base = 'C:\Users\vboxuser\openclaw\openclaw-windows\dist\win-unpacked\resources\gateway\node_modules'
Get-ChildItem $base -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  [PSCustomObject]@{Name=$_.Name; SizeMB=[math]::Round($size/1MB,1)}
} | Sort-Object SizeMB -Descending | Select-Object -First 15 | Format-Table -AutoSize

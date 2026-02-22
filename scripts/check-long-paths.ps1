$base = 'C:\Users\vboxuser\openclaw\openclaw-windows\dist\win-unpacked'
$longPaths = Get-ChildItem $base -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName.Length -gt 200 } |
  Sort-Object { $_.FullName.Length } -Descending |
  Select-Object -First 10

Write-Host "Paths over 200 chars:"
foreach ($f in $longPaths) {
  Write-Host "$($f.FullName.Length): $($f.FullName)"
}

$over260 = (Get-ChildItem $base -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName.Length -gt 260 } | Measure-Object).Count
Write-Host "`nFiles with path > 260 chars: $over260"

# Only check top-level directories for junctions (no recursion)
$base = 'C:\Users\vboxuser\openclaw\openclaw-windows\dist\win-unpacked\resources\gateway\node_modules'
$topLevel = Get-ChildItem $base -ErrorAction SilentlyContinue
$junctions = $topLevel | Where-Object { $_.LinkType -eq 'SymbolicLink' -or $_.LinkType -eq 'Junction' }
Write-Host "Top-level junctions/symlinks: $($junctions.Count) of $($topLevel.Count)"
$junctions | Select-Object -First 10 | ForEach-Object { Write-Host "$($_.LinkType): $($_.Name) -> $($_.Target)" }

# Also check .bin
$bin = Join-Path $base '.bin'
if (Test-Path $bin) {
  $binItems = Get-ChildItem $bin -ErrorAction SilentlyContinue
  $binJunctions = $binItems | Where-Object { $_.LinkType -ne $null }
  Write-Host "`n.bin junctions: $($binJunctions.Count) of $($binItems.Count)"
  $binJunctions | Select-Object -First 5 | ForEach-Object { Write-Host "  $($_.LinkType): $($_.Name)" }
}

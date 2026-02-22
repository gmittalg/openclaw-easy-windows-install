$base = 'C:\Users\vboxuser\openclaw\openclaw-windows\dist\win-unpacked\resources\gateway\node_modules'
$symlinks = Get-ChildItem $base -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.LinkType -eq 'SymbolicLink' -or $_.LinkType -eq 'Junction' }
Write-Host "Symlinks/Junctions found: $($symlinks.Count)"
$symlinks | Select-Object -First 10 | ForEach-Object { Write-Host "$($_.LinkType): $($_.FullName) -> $($_.Target)" }

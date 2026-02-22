$base = 'C:\Users\vboxuser\openclaw\openclaw-windows\gateway-deploy\node_modules'

# Count nested node_modules (depth 2-5)
$nested = Get-ChildItem $base -Directory -Filter 'node_modules' -Recurse -Depth 5 -ErrorAction SilentlyContinue
Write-Host "Nested node_modules count: $($nested.Count)"
$nested | Select-Object -First 5 FullName | ForEach-Object { Write-Host "  $($_.FullName)" }

# Check for .bin inside nested node_modules
$nestedBin = Get-ChildItem $base -Directory -Filter '.bin' -Recurse -Depth 6 -ErrorAction SilentlyContinue
Write-Host "`nNested .bin dirs: $($nestedBin.Count)"
$nestedBin | Select-Object -First 5 FullName | ForEach-Object { Write-Host "  $($_.FullName)" }

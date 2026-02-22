# Check gateway-deploy (not win-unpacked) for symlinks/junctions
$base = 'C:\Users\vboxuser\openclaw\openclaw-windows\gateway-deploy\node_modules'

# Check .bin specifically
$bin = "$base\.bin"
Write-Host "=== .bin directory ==="
if (Test-Path $bin) {
  Get-ChildItem $bin -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.LinkType) {
      Write-Host "$($_.LinkType): $($_.Name) -> $($_.Target)"
    }
  }
  Write-Host ".bin items: $((Get-ChildItem $bin -ErrorAction SilentlyContinue | Measure-Object).Count)"
}

# Check for nested node_modules (creates circular deps in npm flat)
Write-Host "`n=== Nested node_modules (first 10) ==="
Get-ChildItem $base -Directory -Filter 'node_modules' -Recurse -Depth 3 -ErrorAction SilentlyContinue |
  Select-Object -First 10 FullName | ForEach-Object { Write-Host $_.FullName }

Write-Host "`nDone."

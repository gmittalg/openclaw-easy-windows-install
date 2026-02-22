$drive = Get-PSDrive C
$usedGB = [math]::Round($drive.Used/1GB, 1)
$freeGB = [math]::Round($drive.Free/1GB, 1)
Write-Host "Used: $usedGB GB, Free: $freeGB GB"

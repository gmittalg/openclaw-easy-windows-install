Get-Process | Where-Object { $_.ProcessName -like '*nsis*' -or $_.ProcessName -like '*makensis*' -or $_.Name -like '*nsis*' } | Format-Table ProcessName,Id,CPU -AutoSize

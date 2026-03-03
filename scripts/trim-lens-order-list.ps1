$f = Join-Path $PSScriptRoot '..\src\app\dashboard\clients\[id]\_components\lens-order-list.tsx'
$lines = Get-Content $f -Encoding UTF8
# Keep lines 1-248 (index 0-247) and 650-end (index 649-)
$kept = $lines[0..247] + $lines[649..($lines.Length - 1)]
$kept | Set-Content $f -Encoding UTF8
Write-Host "Done. Lines kept: $($kept.Length)"

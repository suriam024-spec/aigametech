$q = (Get-Content "$PSScriptRoot\aiQueries.txt" -Encoding UTF8)[0]
Write-Output ("len=" + $q.Length)
$json = @{ query = $q } | ConvertTo-Json -Compress
Write-Output ("json=" + $json)
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
Write-Output ("bytes=" + $bytes.Length)
try {
  $r = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/ai/search" -ContentType "application/json; charset=utf-8" -Body $bytes
  Write-Output ("usedAi=" + $r.usedAi + " total=" + $r.total)
  Write-Output ("understood=" + ($r.understood | ConvertTo-Json -Compress))
  Write-Output ("notice=" + $r.notice)
  foreach ($g in $r.items) { Write-Output ("  - " + $g.name) }
} catch {
  Write-Output ("ERROR " + $_.ErrorDetails.Message)
}
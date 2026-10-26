$base = "http://localhost:4000"

function Post-Ai($token, $query) {
  $query = [string]$query
  $json = @{ query = $query } | ConvertTo-Json -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  try {
    return Invoke-RestMethod -Method Post -Uri "$base/ai/search" -Headers $headers -ContentType "application/json; charset=utf-8" -Body $bytes
  } catch {
    $code = 0
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    return [pscustomobject]@{ httpError = $code; message = $_.ErrorDetails.Message }
  }
}

function Show-Result($r) {
  if ($r.httpError) { Write-Output ("HTTP " + $r.httpError + " " + $r.message); return }
  Write-Output ("usedAi=" + $r.usedAi + " total=" + $r.total + " shown=" + @($r.items).Count + " needSpec=" + $r.needSpec + " specReady=" + $r.specReady)
  Write-Output ("understood=" + ($r.understood | ConvertTo-Json -Compress))
  Write-Output ("notice=" + $r.notice)
  foreach ($g in $r.items) {
    $st = "-"
    if ($g.specCheck) { $st = $g.specCheck.status }
    Write-Output ("  - " + $g.name + " | " + ($g.genres -join ",") + " | " + $g.price + " | mp=" + $g.multiplayer + " | " + $st)
  }
}

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body (@{ email = "low@demo.com"; password = "demo1234" } | ConvertTo-Json)
$token = $login.token
$queries = Get-Content "$PSScriptRoot\aiQueries.txt" -Encoding UTF8 | Where-Object { $_.Trim() -ne "" }

Write-Output "##### LOGGED IN as low@demo.com #####"
$i = 0
foreach ($q in $queries) {
  $i++
  Write-Output ("=== QUERY " + $i + " ===")
  Show-Result (Post-Ai $token $q)
  Start-Sleep -Seconds 2
}

Write-Output "##### GUEST: query 1 (expect needSpec=True) #####"
Show-Result (Post-Ai $null $queries[0])

Write-Output "##### RATE LIMIT: 12 empty requests (expect 10x400 then 429) #####"
$codes = @()
for ($n = 1; $n -le 12; $n++) {
  $r = Post-Ai $null ""
  $codes += $r.httpError
}
Write-Output ($codes -join ",")
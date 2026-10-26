if (-not $PSScriptRoot) {
  Write-Host "Please run this as a file: powershell -ExecutionPolicy Bypass -File prisma\checkUpgrade.ps1"
  exit
}

$base = "http://localhost:4000"
$out = New-Object System.Collections.Generic.List[string]

function Add-Line([string]$text) { $out.Add($text) }

function Post-Json($path, $body, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $body -Compress))
  try {
    $r = Invoke-RestMethod -Uri "$base$path" -Method Post -Headers $headers -ContentType "application/json; charset=utf-8" -Body $bytes
    return [pscustomobject]@{ Code = 200; Data = $r; Raw = "" }
  } catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    return [pscustomobject]@{ Code = $code; Data = $null; Raw = [string]$_.ErrorDetails.Message }
  }
}

function Show-Result($title, $res) {
  Add-Line ""
  Add-Line "=== $title"
  Add-Line ("HTTP " + $res.Code)
  if ($res.Code -eq 200) {
    Add-Line ("usedAi=" + $res.Data.usedAi + "  status=" + $res.Data.status + "  chars=" + $res.Data.advice.Length)
    if ($res.Data.notice) { Add-Line ("notice: " + $res.Data.notice) }
    Add-Line ([string]$res.Data.advice)
  } else {
    Add-Line $res.Raw
  }
}

# login as low@demo.com
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"low@demo.com","password":"demo1234"}'
$token = $login.token
$games = (Invoke-RestMethod -Uri "$base/games" -Headers @{ Authorization = "Bearer $token" }).items

function Find-Game($pattern) { $games | Where-Object { $_.name -like $pattern } | Select-Object -First 1 }
$elden = Find-Game "*Elden*"
$witcher = Find-Game "*Witcher*"
$disco = Find-Game "*Disco*"
$astro = Find-Game "*Astro*"
$astroId = 21
if ($astro) { $astroId = $astro.id }

Add-Line ("ids: elden=" + $elden.id + " witcher=" + $witcher.id + " disco=" + $disco.id + " astro=" + $astroId)

Show-Result "1 guest (expect 401)"            (Post-Json "/ai/upgrade-advice" @{ gameId = $elden.id } $null)
Show-Result "2 bad id abc (expect 400)"       (Post-Json "/ai/upgrade-advice" @{ gameId = "abc" } $token)
Show-Result "3 game 9999 (expect 404)"        (Post-Json "/ai/upgrade-advice" @{ gameId = 9999 } $token)
Show-Result "4 console game (expect 400)"     (Post-Json "/ai/upgrade-advice" @{ gameId = $astroId } $token)
Show-Result "5 Disco Elysium smooth (expect 200, usedAi=false, no AI call)" (Post-Json "/ai/upgrade-advice" @{ gameId = $disco.id } $token)
Show-Result "6 Elden Ring fail (expect AI advice)"      (Post-Json "/ai/upgrade-advice" @{ gameId = $elden.id } $token)
Show-Result "7 Witcher 3 minimum (expect AI advice)"    (Post-Json "/ai/upgrade-advice" @{ gameId = $witcher.id } $token)

# account without specs (may not exist after db:reset)
$nospecToken = $null
try {
  $l2 = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"spec1907564603@demo.com","password":"demo1234"}'
  $nospecToken = $l2.token
} catch {
  Add-Line ""
  Add-Line "NOTE: no-spec account not found (db:reset?) - test 8 skipped"
}
if ($nospecToken) {
  Show-Result "8 no specs set (expect 400)" (Post-Json "/ai/upgrade-advice" @{ gameId = $elden.id } $nospecToken)
}

$file = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\out9.txt"))
[System.IO.File]::WriteAllText($file, ($out -join "`r`n"), (New-Object System.Text.UTF8Encoding($true)))
Write-Host "Done. Open: $file"
param(
  [string]$Base = "http://localhost:4000",
  [string]$AdminPassword = "admin1234",
  [switch]$SkipWait
)

$ErrorActionPreference = "Stop"
$Base = $Base.TrimEnd("/")
$script:pass = 0
$script:fail = 0
$script:warn = 0
$lines = New-Object System.Collections.Generic.List[string]

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$outFile = [System.IO.Path]::GetFullPath((Join-Path $root "..\..\out11.txt"))

function Say([string]$Text) { $lines.Add($Text); Write-Host $Text }
function Check([string]$Name, [bool]$Ok, [string]$Detail = "") {
  if ($Ok) { $script:pass++; $tag = "[PASS]" } else { $script:fail++; $tag = "[FAIL]" }
  $msg = "$tag $Name"
  if ($Detail -ne "") { $msg = "$msg   ($Detail)" }
  Say $msg
}
function Warn([string]$Text) { $script:warn++; Say "[WARN] $Text" }

function Api([string]$Method, [string]$Path, [string]$Token, $Body) {
  $headers = @{}
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  $params = @{ Uri = "$Base$Path"; Method = $Method; Headers = $headers; UseBasicParsing = $true; TimeoutSec = 90 }
  if ($null -ne $Body) {
    $json = ConvertTo-Json -InputObject $Body -Depth 6 -Compress
    $params["Body"] = [System.Text.Encoding]::UTF8.GetBytes($json)
    $params["ContentType"] = "application/json; charset=utf-8"
  }
  $status = 0
  $text = ""
  try {
    $r = Invoke-WebRequest @params
    $status = [int]$r.StatusCode
    $text = $r.Content
  } catch {
    $resp = $_.Exception.Response
    if ($null -eq $resp) { return @{ Status = 0; Json = $null; Text = $_.Exception.Message } }
    $status = [int]$resp.StatusCode
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
    $text = $sr.ReadToEnd()
  }
  $parsed = $null
  try { $parsed = $text | ConvertFrom-Json } catch { }
  return @{ Status = $status; Json = $parsed; Text = $text }
}

function Login([string]$Email, [string]$Password) {
  $r = Api "POST" "/auth/login" $null @{ email = $Email; password = $Password }
  if ($r.Status -ne 200) { return $null }
  return $r.Json.token
}

function CountStatus($items, [string]$Status) {
  return @($items | Where-Object { $null -ne $_.specCheck -and $_.specCheck.status -eq $Status }).Count
}

try {
  Say "=== E2E test against $Base ==="
  $h = Api "GET" "/health" $null $null
  Check "health" ($h.Status -eq 200) "status=$($h.Status)"
  if ($h.Status -ne 200) { throw "server not reachable" }

  $adminToken = Login "admin@demo.com" $AdminPassword
  $lowToken = Login "low@demo.com" "demo1234"
  $highToken = Login "high@demo.com" "demo1234"
  Check "login low and high" ([bool]$lowToken -and [bool]$highToken)
  if (-not $lowToken -or -not $highToken) { throw "demo login failed (did you run db:reset?)" }
  if (-not $adminToken) { Warn "admin login failed - admin sections skipped (check -AdminPassword)" }

  # ---------- A. Admin stats (must run first, before any activity) ----------
  Say ""; Say "--- A. Admin permissions and stats ---"
  $g401 = Api "GET" "/admin/stats" $null $null
  Check "guest /admin/stats = 401" ($g401.Status -eq 401) "status=$($g401.Status)"
  $u403 = Api "GET" "/admin/stats" $lowToken $null
  Check "user /admin/stats = 403" ($u403.Status -eq 403) "status=$($u403.Status)"
  if ($adminToken) {
    $s = Api "GET" "/admin/stats" $adminToken $null
    Check "admin /admin/stats = 200" ($s.Status -eq 200) "status=$($s.Status)"
    $t = $s.Json.totals
    $fresh = ($t.users -eq 3 -and $t.games -eq 21 -and $t.searches -eq 4 -and $t.views -eq 12 -and $t.favorites -eq 5)
    if ($fresh) {
      Check "stats match fresh seed (3/21/4/12/5)" $true
      Check "top genre = RPG score 12" ($s.Json.topGenres[0].genre -eq "RPG" -and $s.Json.topGenres[0].score -eq 12)
    } else {
      Say "[NOTE] stats differ from fresh seed: users=$($t.users) games=$($t.games) searches=$($t.searches) views=$($t.views) favorites=$($t.favorites) (DB not fresh? run db:reset and rerun)"
    }
  }

  # ---------- B. Recommendations (before our own activity) ----------
  Say ""; Say "--- B. Recommendations ---"
  $rg = Api "GET" "/recommendations" $null $null
  Check "guest recommendations = popular" ($rg.Json.basedOn -eq "popular") "basedOn=$($rg.Json.basedOn)"
  $rl = Api "GET" "/recommendations" $lowToken $null
  $lowGenres = ($rl.Json.topGenres -join ", ")
  Check "low recommendations = interest, RPG then Simulation" ($rl.Json.basedOn -eq "interest" -and $lowGenres.StartsWith("RPG, Simulation")) "genres=$lowGenres"
  $rh = Api "GET" "/recommendations" $highToken $null
  $highGenres = ($rh.Json.topGenres -join ", ")
  Check "high recommendations = interest, FPS then Open World" ($rh.Json.basedOn -eq "interest" -and $highGenres.StartsWith("FPS, Open World")) "genres=$highGenres"

  # ---------- C. Games and spec check ----------
  Say ""; Say "--- C. Games, filters, spec check ---"
  $g = Api "GET" "/games" $null $null
  Check "guest /games total 21, specReady false" ($g.Json.total -eq 21 -and $g.Json.specReady -eq $false) "total=$($g.Json.total)"
  $badges = @($g.Json.items | Where-Object { $null -ne $_.specCheck }).Count
  Check "guest sees no spec badges" ($badges -eq 0) "badges=$badges"

  $gl = Api "GET" "/games" $lowToken $null
  $sm = CountStatus $gl.Json.items "smooth"
  $mn = CountStatus $gl.Json.items "minimum"
  $fl = CountStatus $gl.Json.items "fail"
  Check "low: smooth 11 / minimum 3 / fail 4" ($sm -eq 11 -and $mn -eq 3 -and $fl -eq 4) "smooth=$sm minimum=$mn fail=$fl"
  $none = @($gl.Json.items | Where-Object { $null -eq $_.specCheck }).Count
  Check "low: 3 console-only games have no badge" ($none -eq 3) "none=$none"

  $gh = Api "GET" "/games" $highToken $null
  $hs = CountStatus $gh.Json.items "smooth"
  Check "high: smooth 18" ($hs -eq 18) "smooth=$hs"

  $cl = Api "GET" "/games?compatibleOnly=true" $lowToken $null
  Check "low compatibleOnly = 14" ($cl.Json.total -eq 14) "total=$($cl.Json.total)"
  $ch = Api "GET" "/games?compatibleOnly=true" $highToken $null
  Check "high compatibleOnly = 18" ($ch.Json.total -eq 18) "total=$($ch.Json.total)"
  $cg = Api "GET" "/games?compatibleOnly=true" $null $null
  Check "guest compatibleOnly = 401" ($cg.Status -eq 401) "status=$($cg.Status)"

  $se = Api "GET" "/games?search=Elden" $lowToken $null
  Check "search Elden = 1 game" ($se.Json.total -eq 1) "total=$($se.Json.total)"
  $sp = Api "GET" "/games?sort=price_asc" $null $null
  $prices = @($sp.Json.items | ForEach-Object { [int]$_.price })
  $sorted = $true
  for ($i = 1; $i -lt $prices.Count; $i++) { if ($prices[$i] -lt $prices[$i - 1]) { $sorted = $false } }
  Check "sort price_asc is ascending" ($sorted -and $prices.Count -eq 21)

  $d = Api "GET" "/games/15" $lowToken $null
  Check "game 15 = Elden Ring, low status fail" ($d.Json.name -eq "Elden Ring" -and $d.Json.specCheck.status -eq "fail") "status=$($d.Json.specCheck.status)"
  Check "similar games <= 4" (@($d.Json.similar).Count -le 4)
  $d404 = Api "GET" "/games/9999" $null $null
  Check "game 9999 = 404" ($d404.Status -eq 404) "status=$($d404.Status)"
  $dbad = Api "GET" "/games/abc" $null $null
  Check "game abc = 400" ($dbad.Status -eq 400) "status=$($dbad.Status)"

  # ---------- D. New user: register, favorite, My Specs ----------
  Say ""; Say "--- D. New user flow ---"
  $email = "e2e" + (Get-Random -Minimum 10000 -Maximum 99999) + "@test.com"
  $reg = Api "POST" "/auth/register" $null @{ email = $email; password = "E2e-pass-12345" }
  Check "register new user" (($reg.Status -eq 200 -or $reg.Status -eq 201) -and [bool]$reg.Json.token) "status=$($reg.Status)"
  if (-not $reg.Json.token) { throw "register failed" }
  $newToken = $reg.Json.token
  $dup = Api "POST" "/auth/register" $null @{ email = $email; password = "E2e-pass-12345" }
  Check "duplicate register rejected (4xx)" ($dup.Status -ge 400 -and $dup.Status -lt 500) "status=$($dup.Status)"
  $bad = Api "POST" "/auth/login" $null @{ email = $email; password = "wrong-password" }
  Check "wrong password rejected (4xx)" ($bad.Status -ge 400 -and $bad.Status -lt 500) "status=$($bad.Status)"
  $me = Api "GET" "/auth/me" $newToken $null
  Check "/auth/me returns the new email" ($me.Json.user.email -eq $email)

  $rn = Api "GET" "/recommendations" $newToken $null
  Check "new user recommendations = popular" ($rn.Json.basedOn -eq "popular") "basedOn=$($rn.Json.basedOn)"

  $fg = Api "POST" "/favorites/15" $null $null
  Check "guest favorite = 401" ($fg.Status -eq 401) "status=$($fg.Status)"
  $f1 = Api "POST" "/favorites/15" $newToken $null
  Check "favorite add" ($f1.Json.isFavorite -eq $true) "status=$($f1.Status)"
  $f2 = Api "GET" "/favorites" $newToken $null
  Check "favorites list = 1" ($f2.Json.total -eq 1) "total=$($f2.Json.total)"
  $f3 = Api "DELETE" "/favorites/15" $newToken $null
  Check "favorite remove" ($f3.Json.isFavorite -eq $false) "status=$($f3.Status)"
  $f4 = Api "POST" "/favorites/9999" $newToken $null
  Check "favorite game 9999 = 404" ($f4.Status -eq 404) "status=$($f4.Status)"

  $cn0 = Api "GET" "/games?compatibleOnly=true" $newToken $null
  Check "no spec + compatibleOnly = 400" ($cn0.Status -eq 400) "status=$($cn0.Status)"
  $opt = Api "GET" "/specs/options" $newToken $null
  Check "spec options = 10 CPU, 10 GPU" (@($opt.Json.cpus).Count -eq 10 -and @($opt.Json.gpus).Count -eq 10)
  $cpu4 = @($opt.Json.cpus | Where-Object { $_.tier -eq 4 })[0]
  $gpu4 = @($opt.Json.gpus | Where-Object { $_.tier -eq 4 })[0]
  $ms0 = Api "GET" "/me/specs" $newToken $null
  Check "new user has no spec" ($ms0.Json.isSet -eq $false)
  $pbad = Api "PUT" "/me/specs" $newToken @{ cpuId = $cpu4.id; gpuId = $gpu4.id; ramGb = 1 }
  Check "PUT spec with RAM 1 = 400" ($pbad.Status -eq 400) "status=$($pbad.Status)"
  $pmiss = Api "PUT" "/me/specs" $newToken @{ cpuId = $cpu4.id }
  Check "PUT spec missing fields = 400" ($pmiss.Status -eq 400) "status=$($pmiss.Status)"
  $pok = Api "PUT" "/me/specs" $newToken @{ cpuId = $cpu4.id; gpuId = $gpu4.id; ramGb = 16 }
  Check "PUT spec tier4/tier4/16GB = 200" ($pok.Status -eq 200) "status=$($pok.Status)"
  $gn = Api "GET" "/games" $newToken $null
  $ns = CountStatus $gn.Json.items "smooth"
  Check "new spec: smooth 18" ($ns -eq 18) "smooth=$ns"
  $cn1 = Api "GET" "/games?compatibleOnly=true" $newToken $null
  Check "new spec: compatibleOnly = 18" ($cn1.Json.total -eq 18) "total=$($cn1.Json.total)"
  $del = Api "DELETE" "/me/specs" $newToken $null
  Check "clear spec = 200" ($del.Status -eq 200) "status=$($del.Status)"
  $ms1 = Api "GET" "/me/specs" $newToken $null
  Check "spec cleared" ($ms1.Json.isSet -eq $false)

  # ---------- E. Admin CRUD ----------
  Say ""; Say "--- E. Admin add / edit / delete ---"
  if ($adminToken) {
    $gname = "E2E Test Game " + (Get-Random -Minimum 1000 -Maximum 9999)
    $game = @{
      name = $gname; description = "E2E test game"; genres = @("RPG"); tags = @("e2e"); platforms = @("PC")
      price = 100; releaseDate = "2024-01-01"; difficulty = "Easy"; multiplayer = $false; playTime = 10; isIndie = $false
      requirements = @{ min = @{ cpuTier = 1; gpuTier = 1; ramGb = 4 }; rec = @{ cpuTier = 2; gpuTier = 2; ramGb = 8 } }
    }
    $uc = Api "POST" "/admin/games" $lowToken $game
    Check "user POST /admin/games = 403" ($uc.Status -eq 403) "status=$($uc.Status)"
    $gc = Api "POST" "/admin/games" $null $game
    Check "guest POST /admin/games = 401" ($gc.Status -eq 401) "status=$($gc.Status)"

    $e1 = $game.Clone(); $e1.name = ""
    $r1 = Api "POST" "/admin/games" $adminToken $e1
    Check "empty name = 400" ($r1.Status -eq 400) "status=$($r1.Status)"
    $e2 = $game.Clone(); $e2.requirements = @{ min = @{ cpuTier = 3; gpuTier = 3; ramGb = 8 }; rec = @{ cpuTier = 2; gpuTier = 2; ramGb = 8 } }
    $r2 = Api "POST" "/admin/games" $adminToken $e2
    Check "Rec below Min = 400" ($r2.Status -eq 400) "status=$($r2.Status)"
    $e3 = $game.Clone(); $e3.requirements = @{ min = @{ cpuTier = 6; gpuTier = 1; ramGb = 4 }; rec = @{ cpuTier = 6; gpuTier = 2; ramGb = 8 } }
    $r3 = Api "POST" "/admin/games" $adminToken $e3
    Check "tier 6 = 400" ($r3.Status -eq 400) "status=$($r3.Status)"

    $cr = Api "POST" "/admin/games" $adminToken $game
    Check "create game = 201" ($cr.Status -eq 201 -and [bool]$cr.Json.id) "status=$($cr.Status)"
    if (-not $cr.Json.id) { throw "create game failed" }
    $newId = $cr.Json.id
    $dp = Api "POST" "/admin/games" $adminToken $game
    Check "duplicate name = 409" ($dp.Status -eq 409) "status=$($dp.Status)"
    $gt = Api "GET" "/games" $null $null
    Check "games total = 22" ($gt.Json.total -eq 22) "total=$($gt.Json.total)"

    $upd = $game.Clone(); $upd.price = 250; $upd.requirements = $null
    $up = Api "PUT" "/admin/games/$newId" $adminToken $upd
    Check "update game = 200" ($up.Status -eq 200) "status=$($up.Status)"
    $gd = Api "GET" "/games/$newId" $null $null
    Check "price 250 and requirements cleared" ($gd.Json.price -eq 250 -and $null -eq $gd.Json.requirements)

    $dl = Api "DELETE" "/admin/games/$newId" $adminToken $null
    Check "delete game" ($dl.Json.deleted -eq $true) "status=$($dl.Status)"
    $gone = Api "GET" "/games/$newId" $null $null
    Check "deleted game = 404" ($gone.Status -eq 404) "status=$($gone.Status)"
    $dl2 = Api "DELETE" "/admin/games/$newId" $adminToken $null
    Check "delete again = 404" ($dl2.Status -eq 404) "status=$($dl2.Status)"
    $gt2 = Api "GET" "/games" $null $null
    Check "games total back to 21" ($gt2.Json.total -eq 21) "total=$($gt2.Json.total)"
  } else {
    Say "[NOTE] section E skipped (no admin token)"
  }

  # ---------- F. AI (9 requests in one minute window) ----------
  Say ""; Say "--- F. AI Search and Upgrade Advisor (9 requests) ---"
  if (-not $SkipWait) { Say "Waiting 61 seconds so the /ai rate-limit window is clean..."; Start-Sleep -Seconds 61 }
  $farm = [regex]::Unescape("\u0e40\u0e01\u0e21\u0e17\u0e33\u0e1f\u0e32\u0e23\u0e4c\u0e21")
  $ghost = [regex]::Unescape("\u0e40\u0e01\u0e21\u0e1c\u0e35\u0e2a\u0e22\u0e2d\u0e07\u0e02\u0e27\u0e31\u0e0d")

  $a1 = Api "POST" "/ai/search" $lowToken @{ query = $farm }
  $names = @($a1.Json.items | ForEach-Object { $_.name })
  Check "AI search (farm game) includes Stardew Valley" ($a1.Status -eq 200 -and ($names -contains "Stardew Valley")) "status=$($a1.Status) items=$($names.Count)"
  if ($a1.Json.usedAi -ne $true) { Warn "AI search used fallback (keyword). If AI should be up, read the server terminal for [ai/search] error" }

  $a2 = Api "POST" "/ai/search" $null @{ query = $ghost }
  Check "AI search (horror, not in data) = 200 and 0 items" ($a2.Status -eq 200 -and @($a2.Json.items).Count -eq 0) "status=$($a2.Status) items=$(@($a2.Json.items).Count)"

  $u1 = Api "POST" "/ai/upgrade-advice" $lowToken @{ gameId = 15 }
  Check "upgrade advice Elden Ring: status fail, advice not empty" ($u1.Status -eq 200 -and $u1.Json.status -eq "fail" -and $u1.Json.advice.Length -gt 20) "status=$($u1.Status) len=$($u1.Json.advice.Length)"
  if ($u1.Json.usedAi -ne $true) { Warn "upgrade advice used fallback. If AI should be up, read the server terminal for [ai/upgrade] error" }

  $u2 = Api "POST" "/ai/upgrade-advice" $lowToken @{ gameId = 9 }
  Check "upgrade advice Disco Elysium: smooth, usedAi false" ($u2.Json.status -eq "smooth" -and $u2.Json.usedAi -eq $false) "status=$($u2.Json.status)"
  $u3 = Api "POST" "/ai/upgrade-advice" $null @{ gameId = 15 }
  Check "guest upgrade advice = 401" ($u3.Status -eq 401) "status=$($u3.Status)"
  $u4 = Api "POST" "/ai/upgrade-advice" $lowToken @{ gameId = "abc" }
  Check "gameId abc = 400" ($u4.Status -eq 400) "status=$($u4.Status)"
  $u5 = Api "POST" "/ai/upgrade-advice" $lowToken @{ gameId = 9999 }
  Check "gameId 9999 = 404" ($u5.Status -eq 404) "status=$($u5.Status)"
  $u6 = Api "POST" "/ai/upgrade-advice" $lowToken @{ gameId = 21 }
  Check "console-only game (Astro Bot) = 400" ($u6.Status -eq 400) "status=$($u6.Status)"
  $u7 = Api "POST" "/ai/upgrade-advice" $newToken @{ gameId = 15 }
  Check "user without spec = 400" ($u7.Status -eq 400) "status=$($u7.Status)"
} catch {
  $script:fail++
  Say "[FAIL] script stopped: $($_.Exception.Message)"
} finally {
  Say ""
  Say "RESULT: PASS=$($script:pass) FAIL=$($script:fail) WARN=$($script:warn)"
  [System.IO.File]::WriteAllText($outFile, ($lines -join "`r`n"), (New-Object System.Text.UTF8Encoding($true)))
  Write-Host "Saved: $outFile"
}
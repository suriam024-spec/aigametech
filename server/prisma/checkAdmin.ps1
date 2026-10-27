$base = "http://localhost:4000"
$out = New-Object System.Collections.ArrayList
function Log($s) { [void]$out.Add([string]$s) }

function Invoke-Api($method, $path, $token, $body) {
  $h = @{}
  if ($token) { $h["Authorization"] = "Bearer $token" }
  try {
    if ($null -ne $body) {
      $json = ConvertTo-Json -InputObject $body -Depth 6
      $r = Invoke-RestMethod -Uri "$base$path" -Method $method -Headers $h -ContentType "application/json" -Body $json
    } else {
      $r = Invoke-RestMethod -Uri "$base$path" -Method $method -Headers $h
    }
    return @{ ok = $true; status = 200; body = $r; error = "" }
  } catch {
    $err = $_
    $code = 0
    if ($err.Exception.Response) { $code = [int]$err.Exception.Response.StatusCode }
    $msg = ""
    if ($err.ErrorDetails -and $err.ErrorDetails.Message) {
      try { $msg = ($err.ErrorDetails.Message | ConvertFrom-Json).error } catch { $msg = [string]$err.ErrorDetails.Message }
    }
    return @{ ok = $false; status = $code; body = $null; error = $msg }
  }
}

function Show($label, $expect, $res) {
  $got = if ($res.ok) { "OK" } else { [string]$res.status }
  $mark = if ("$got" -eq "$expect") { "PASS" } else { "FAIL" }
  Log ("[{0}] {1} -> expect {2}, got {3} {4}" -f $mark, $label, $expect, $got, $res.error)
}

$adm = (Invoke-Api POST "/auth/login" $null @{ email = "admin@demo.com"; password = "admin1234" }).body.token
$low = (Invoke-Api POST "/auth/login" $null @{ email = "low@demo.com"; password = "demo1234" }).body.token
if (-not $adm -or -not $low) { Log "LOGIN FAILED (admin/low)"; }

Log "=== 1. สิทธิ์ ==="
Show "guest GET /admin/stats" 401 (Invoke-Api GET "/admin/stats" $null $null)
Show "low GET /admin/stats" 403 (Invoke-Api GET "/admin/stats" $low $null)
Show "low DELETE /admin/games/1" 403 (Invoke-Api DELETE "/admin/games/1" $low $null)

Log "=== 2. สถิติ ==="
$st = Invoke-Api GET "/admin/stats" $adm $null
Show "admin GET /admin/stats" "OK" $st
if ($st.ok) {
  $t = $st.body.totals
  Log ("totals: users={0} games={1} searches={2} views={3} favorites={4}" -f $t.users, $t.games, $t.searches, $t.views, $t.favorites)
  foreach ($g in $st.body.topGames) { Log ("topGame: {0} pop={1} (v{2}/f{3})" -f $g.name, $g.popularity, $g.views, $g.favorites) }
  foreach ($g in $st.body.topGenres) { Log ("topGenre: {0} score={1}" -f $g.genre, $g.score) }
}
$total0 = (Invoke-Api GET "/games" $null $null).body.total
Log "games total before = $total0"

Log "=== 3. validate (ต้อง 400/409 ทั้งหมด) ==="
$name = "ZZ Test Game " + (Get-Random)
$good = @{
  name = $name; description = "test"; genres = @("Puzzle", "TestGenre"); tags = @("test"); platforms = @("PC")
  price = 99; releaseDate = "2024-05-01"; difficulty = "Easy"; multiplayer = $false; playTime = 3; isIndie = $true
  image = ""
  requirements = @{ min = @{ cpuTier = 1; gpuTier = 1; ramGb = 4 }; rec = @{ cpuTier = 2; gpuTier = 2; ramGb = 8 } }
}
$b = $good.Clone(); $b["name"] = ""
Show "ชื่อว่าง" 400 (Invoke-Api POST "/admin/games" $adm $b)
$b = $good.Clone(); $b["price"] = -5
Show "ราคาติดลบ" 400 (Invoke-Api POST "/admin/games" $adm $b)
$b = $good.Clone(); $b["genres"] = @()
Show "genres ว่าง" 400 (Invoke-Api POST "/admin/games" $adm $b)
$b = $good.Clone(); $b["difficulty"] = "Super"
Show "difficulty ผิด" 400 (Invoke-Api POST "/admin/games" $adm $b)
$b = $good.Clone(); $b["releaseDate"] = "2024-02-31"
Show "วันที่ไม่มีจริง" 400 (Invoke-Api POST "/admin/games" $adm $b)
$b = $good.Clone(); $b["image"] = "ftp://x.y/z.png"
Show "รูปไม่ใช่ http" 400 (Invoke-Api POST "/admin/games" $adm $b)
$b = $good.Clone(); $b["requirements"] = @{ min = @{ cpuTier = 6; gpuTier = 1; ramGb = 4 }; rec = @{ cpuTier = 6; gpuTier = 2; ramGb = 8 } }
Show "tier = 6" 400 (Invoke-Api POST "/admin/games" $adm $b)
$b = $good.Clone(); $b["requirements"] = @{ min = @{ cpuTier = 3; gpuTier = 3; ramGb = 8 }; rec = @{ cpuTier = 2; gpuTier = 3; ramGb = 8 } }
Show "rec ต่ำกว่า min" 400 (Invoke-Api POST "/admin/games" $adm $b)
$b = $good.Clone(); $b["name"] = "Stardew Valley"
Show "ชื่อซ้ำ" 409 (Invoke-Api POST "/admin/games" $adm $b)
Show "id ไม่ใช่เลข" 400 (Invoke-Api PUT "/admin/games/abc" $adm $good)
Show "PUT เกมไม่มี" 404 (Invoke-Api PUT "/admin/games/99999" $adm $good)

Log "=== 4. เพิ่ม/ดู/แก้ ==="
$c = Invoke-Api POST "/admin/games" $adm $good
Show "POST เกมใหม่" "OK" $c
$id = $c.body.id
Log "new id = $id"
$d = Invoke-Api GET "/games/$id" $null $null
Show "GET /games/$id" "OK" $d
if ($d.ok) {
  Log ("genres={0} platforms={1} price={2} image={3}" -f ($d.body.genres -join ","), ($d.body.platforms -join ","), $d.body.price, $d.body.image)
  Log ("requirements: min={0}/{1}/{2} rec={3}/{4}/{5}" -f $d.body.requirements.min.cpuTier, $d.body.requirements.min.gpuTier, $d.body.requirements.min.ramGb, $d.body.requirements.rec.cpuTier, $d.body.requirements.rec.gpuTier, $d.body.requirements.rec.ramGb)
}

# สร้าง favorite + view ของ low เพื่อดูว่าลบเกมแล้วข้อมูลลูกหายตาม
Show "low favorite เกมใหม่" "OK" (Invoke-Api POST "/favorites/$id" $low $null)
Show "low เปิดหน้าเกมใหม่ (บันทึก View)" "OK" (Invoke-Api GET "/games/$id" $low $null)

$u = $good.Clone(); $u["price"] = 199; $u["requirements"] = $null
$ur = Invoke-Api PUT "/admin/games/$id" $adm $u
Show "PUT แก้ราคา + ล้าง requirements" "OK" $ur
$d2 = Invoke-Api GET "/games/$id" $null $null
if ($d2.ok) { Log ("หลังแก้: price={0} requirements={1} (ต้อง 199 และ ว่าง)" -f $d2.body.price, $d2.body.requirements) }

Log "=== 5. ลบ ==="
$del = Invoke-Api DELETE "/admin/games/$id" $adm $null
Show "DELETE เกมทดสอบ" "OK" $del
if ($del.ok) { Log ("removedFavorites={0} removedViews={1} (ต้อง 1 และ 1)" -f $del.body.removedFavorites, $del.body.removedViews) }
Show "GET เกมที่ลบแล้ว" 404 (Invoke-Api GET "/games/$id" $null $null)
Show "DELETE ซ้ำ" 404 (Invoke-Api DELETE "/admin/games/$id" $adm $null)
$total1 = (Invoke-Api GET "/games" $null $null).body.total
Log "games total after = $total1 (ต้องเท่ากับ before = $total0)"

$path = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\out10.txt"))
[System.IO.File]::WriteAllText($path, ($out -join "`r`n"), (New-Object System.Text.UTF8Encoding($true)))
Write-Host "เขียนผลลง $path แล้ว"
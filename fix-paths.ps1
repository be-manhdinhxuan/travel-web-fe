# ============================================================
# fix-paths.ps1 — Chạy trong VS Code terminal tại thư mục gốc
# ============================================================

$htmlDir = ".\code du an\html"
$jsDir   = ".\code du an\js"

# ---- CSS mapping ----
$cssMap = @{
    'href="2bass.css"'       = 'href="../css/bass.css"'
    'href="2auth.css"'       = 'href="../css/auth.css"'
    'href="2admin.css"'      = 'href="../css/admin.css"'
    'href="2admintour.css"'  = 'href="../css/admin-tour.css"'
    'href="2canhan.css"'     = 'href="../css/ca-nhan.css"'
    'href="2checkout.css"'   = 'href="../css/checkout.css"'
    'href="2components.css"' = 'href="../css/companents.css"'
    'href="2nav.css"'        = 'href="../css/nav.css"'
    'href="2nhanvien.css"'   = 'href="../css/nhan-vien.css"'
    'href="2thanhcong.css"'  = 'href="../css/thanh-cong.css"'
    'href="2uudai.css"'      = 'href="../css/uu-dai.css"'
    'href="2vechungtoi.css"' = 'href="../css/ve-chung-toi.css"'
}

# ---- JS mapping ----
$jsMap = @{
    'src="config.js"'      = 'src="../js/config.js"'
    'src="3api.js"'        = 'src="../js/api.js"'
    'src="3admin.js"'      = 'src="../js/admin.js"'
    'src="3auth.js"'       = 'src="../js/auth.js"'
    'src="3booking.js"'    = 'src="../js/booking.js"'
    'src="3canhan.js"'     = 'src="../js/ca-nhan.js"'
    'src="3checkout.js"'   = 'src="../js/checkout.js"'
    'src="3data.js"'       = 'src="../js/data.js"'
    'src="3favouites.js"'  = 'src="../js/favouites.js"'
    'src="3nav.js"'        = 'src="../js/nav.js"'
    'src="3nhanvien.js"'   = 'src="../js/nhan-vien.js"'
    'src="3recommend.js"'  = 'src="../js/recommend.js"'
    'src="3toast.js"'      = 'src="../js/toast.js"'
    'src="3uudai.js"'      = 'src="../js/uu-dai.js"'
}

# ---- Page link mapping ----
$pageMap = @{
    '1admin.html'             = 'admin.html'
    '1admintour.html'         = 'admin-tour.html'
    '1canhan.html'            = 'ca-nhan.html'
    '1dangky.html'            = 'dang-ky.html'
    '1dangnhap-nhanvien.html' = 'dang-nhap.html'
    '1datour.html'            = 'dat-tour.html'
    '1diemden.html'           = 'diem-den.html'
    '1quenmatkhau.html'       = 'quen-mat-khau.html'
    '1uudai.html'             = 'uu-dai.html'
    '1vechungtoi.html'        = 've-chung-toi.html'
    '../html/tour-du-lich.html' = 'tour-du-lich.html'
}

function Fix-Content($content) {
    foreach ($old in $cssMap.Keys)  { $content = $content.Replace($old, $cssMap[$old]) }
    foreach ($old in $jsMap.Keys)   { $content = $content.Replace($old, $jsMap[$old]) }
    foreach ($old in $pageMap.Keys) {
        $new = $pageMap[$old]
        $content = $content.Replace("href=`"$old`"",          "href=`"$new`"")
        $content = $content.Replace("href='$old'",             "href='$new'")
        $content = $content.Replace("location.href='$old'",    "location.href='$new'")
        $content = $content.Replace("location.href=`"$old`"",  "location.href=`"$new`"")
    }
    return $content
}

# Fix tất cả HTML
Get-ChildItem "$htmlDir\*.html" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $fixed   = Fix-Content $content
    Set-Content $_.FullName $fixed -Encoding UTF8 -NoNewline
    Write-Host "Fixed HTML: $($_.Name)" -ForegroundColor Green
}

# Fix JS files
$jsFiles = @("auth.js", "nav.js", "nhan-vien.js")
foreach ($jsFile in $jsFiles) {
    $path    = "$jsDir\$jsFile"
    $content = Get-Content $path -Raw -Encoding UTF8
    $fixed   = Fix-Content $content
    Set-Content $path $fixed -Encoding UTF8 -NoNewline
    Write-Host "Fixed JS: $jsFile" -ForegroundColor Green
}

Write-Host "`n✅ Xong! Chạy git add/commit/push để đẩy lên." -ForegroundColor Cyan

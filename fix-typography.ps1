# ============================================================
# fix-typography.ps1
# Chạy tại thư mục gốc: .\fix-typography.ps1
# ============================================================

$cssDir  = ".\code du an\css"
$htmlDir = ".\code du an\html"

# ============================================================
# 1. GHI ĐÈ bass.css
# ============================================================
$bassCss = @'
/* ============================================================
   BASS.CSS — Global reset + Typography System
   Font: Montserrat (heading) + Inter (body) | Base: 15px
============================================================ */

@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700&family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,300..700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --green:        #2d8a4e;
  --green-light:  #3aaa62;
  --gold:         #c9963a;
  --dark:         #0d1f17;
  --text:         #2a2a2a;
  --muted:        #666;
  --white:        #ffffff;

  --font-heading: 'Montserrat', sans-serif;
  --font-body:    'Inter', sans-serif;

  --fs-xs:   0.733rem;
  --fs-sm:   0.867rem;
  --fs-base: 1rem;
  --fs-md:   1.067rem;
  --fs-lg:   1.2rem;
  --fs-xl:   1.467rem;
  --fs-2xl:  1.867rem;
  --fs-3xl:  2.267rem;
  --fs-4xl:  3rem;

  --lh-tight:  1.2;
  --lh-normal: 1.6;
  --lh-loose:  1.75;

  --fw-regular:  400;
  --fw-medium:   500;
  --fw-semibold: 600;
  --fw-bold:     700;
  --fw-black:    900;
}

html { font-size: 15px; }

body {
  font-family: var(--font-body);
  font-size: var(--fs-base);
  line-height: var(--lh-normal);
  color: var(--text);
  background: var(--white);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  color: var(--dark);
}

h1 { font-size: var(--fs-4xl); font-weight: var(--fw-black); }
h2 { font-size: var(--fs-3xl); }
h3 { font-size: var(--fs-2xl); }
h4 { font-size: var(--fs-xl);  }
h5 { font-size: var(--fs-lg);  }
h6 { font-size: var(--fs-md);  }

a { color: inherit; text-decoration: none; }
button { font-family: var(--font-body); }
input, select, textarea { font-family: var(--font-body); font-size: var(--fs-base); }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shakeX {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
@keyframes popIn {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(45,138,78,0.5); }
  50%      { box-shadow: 0 4px 32px rgba(45,138,78,0.8), 0 0 0 8px rgba(45,138,78,0.1); }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: .4; }
}
@keyframes typingAnim {
  0%, 80%, 100% { transform: scale(0.7); opacity: .5; }
  40%           { transform: scale(1);   opacity: 1; }
}
'@

Set-Content "$cssDir\bass.css" $bassCss -Encoding UTF8 -NoNewline
Write-Host "✅ Ghi bass.css xong" -ForegroundColor Green

# ============================================================
# 2. FIX CÁC FILE CSS KHÁC
# ============================================================
function Fix-CSS($content) {
    # Font family
    $content = $content -replace "font-family:\s*'Inter',\s*serif",       "font-family: var(--font-heading)"
    $content = $content -replace 'font-family:\s*"Inter",\s*serif',        "font-family: var(--font-heading)"
    $content = $content -replace "font-family:\s*'Inter',\s*sans-serif",   "font-family: var(--font-body)"
    $content = $content -replace 'font-family:\s*"Inter",\s*sans-serif',   "font-family: var(--font-body)"
    $content = $content -replace "font-family:\s*'Inter',\s*'Segoe UI',\s*sans-serif", "font-family: var(--font-body)"
    $content = $content -replace "font-family:\s*'Inter'",                 "font-family: var(--font-body)"

    # font-size px → rem (base 15px)
    $content = [regex]::Replace($content, 'font-size:\s*([\d.]+)px', {
        param($m)
        $px  = [double]$m.Groups[1].Value
        $rem = [math]::Round($px / 15, 3)
        "font-size: ${rem}rem"
    })

    return $content
}

$skipFiles = @("bass.css")
Get-ChildItem "$cssDir\*.css" | Where-Object { $_.Name -notin $skipFiles } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $fixed   = Fix-CSS $content
    Set-Content $_.FullName $fixed -Encoding UTF8 -NoNewline
    Write-Host "✅ Fixed CSS: $($_.Name)" -ForegroundColor Green
}

# ============================================================
# 3. XÓA GOOGLE FONTS IMPORT THỪA TRONG HTML
# ============================================================
function Clean-FontImports($content) {
    # Xóa preconnect fonts
    $content = [regex]::Replace($content,
        '\s*<link rel="preconnect" href="https://fonts\.googleapis\.com"[^>]*>', '')
    $content = [regex]::Replace($content,
        '\s*<link rel="preconnect" href="https://fonts\.gstatic\.com"[^>]*>', '')
    # Xóa import Inter
    $content = [regex]::Replace($content,
        '\s*<link\s[^>]*fonts\.googleapis\.com/css2\?family=Inter[^>]*>', '')
    # Xóa import Be Vietnam Pro
    $content = [regex]::Replace($content,
        '\s*<link\s[^>]*fonts\.googleapis\.com/css2\?family=Be\+Vietnam[^>]*>', '')
    return $content
}

Get-ChildItem "$htmlDir\*.html" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $fixed   = Clean-FontImports $content
    if ($fixed -ne $content) {
        Set-Content $_.FullName $fixed -Encoding UTF8 -NoNewline
        Write-Host "✅ Cleaned HTML: $($_.Name)" -ForegroundColor Cyan
    }
}

Write-Host "`n🎉 Xong! Typography đã được cập nhật toàn bộ." -ForegroundColor Yellow
Write-Host "   Chạy: git add . && git commit -m 'style: update typography Montserrat + Inter 15px' && git push" -ForegroundColor Gray

# apply-design.ps1 — Copy giao diện mới từ code-demo vào project
# Chạy tại thư mục gốc: .\apply-design.ps1

$css  = ".\code du an\css"
$html = ".\code du an\html"

# Copy CSS
Copy-Item ".\css-update\*.css" $css -Force
Write-Host "✅ Copied CSS" -ForegroundColor Green

# Copy HTML  
Copy-Item ".\html-update\*.html" $html -Force
Write-Host "✅ Copied HTML" -ForegroundColor Green

Write-Host "`nXong! Chạy git add/commit/push." -ForegroundColor Cyan

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("images\金ロゴ.png")
$w = [int]$img.Width
$h = [int]$img.Height

$leftBg = New-Object System.Drawing.Bitmap(1, $h)
$rightBg = New-Object System.Drawing.Bitmap(1, $h)
$g1 = [System.Drawing.Graphics]::FromImage($leftBg)
$g2 = [System.Drawing.Graphics]::FromImage($rightBg)

$srcRectL = New-Object System.Drawing.Rectangle(0, 0, 1, $h)
$srcRectR = New-Object System.Drawing.Rectangle($w - 1, 0, 1, $h)
$destRect = New-Object System.Drawing.Rectangle(0, 0, 1, $h)

$g1.DrawImage($img, $destRect, $srcRectL, [System.Drawing.GraphicsUnit]::Pixel)
$g2.DrawImage($img, $destRect, $srcRectR, [System.Drawing.GraphicsUnit]::Pixel)

$leftBg.Save("images\logo-bg-left.png", [System.Drawing.Imaging.ImageFormat]::Png)
$rightBg.Save("images\logo-bg-right.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g1.Dispose()
$g2.Dispose()
$leftBg.Dispose()
$rightBg.Dispose()
$img.Dispose()

Add-Type -AssemblyName System.Drawing

$inputPath = "images/top_bg.png"
$outputPath = "images/hero_bg.jpg"

if (-not (Test-Path $inputPath)) {
    Write-Host "Error: Input file not found."
    exit 1
}

try {
    $image = [System.Drawing.Image]::FromFile($inputPath)
    $quality = [System.Drawing.Imaging.Encoder]::Quality
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($quality, 80)
    $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }

    $image.Save($outputPath, $jpegCodec, $encoderParams)
    $image.Dispose()

    Write-Host "Successfully converted to $outputPath"
} catch {
    Write-Host "Error: $_"
    exit 1
}

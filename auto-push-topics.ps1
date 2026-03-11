# Topics Auto-Push Script for Windows
# This script monitors 'js/topics-data.js' and automatically pushes changes to GitHub.

$targetFile = "js/topics-data.js"

Write-Host "--- トピックス自動送信スクリプト起動中 ---" -ForegroundColor Cyan
Write-Host "監視対象: $targetFile"
Write-Host "このウィンドウを開いている間、ファイルを保存すると自動でGitHubへ送信されます。"
Write-Host "終了するにはこのウィンドウを閉じるか、Ctrl+Cを押してください。"

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = Join-Path (Get-Location) "js"
$watcher.Filter = "topics-data.js"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$action = {
    $changeType = $Event.SourceEventArgs.ChangeType
    Write-Host "$(Get-Date -Format 'HH:mm:ss') - ファイルの更新を検知しました: $changeType" -ForegroundColor Yellow
    
    # 少し待ってファイルロックを避ける
    Start-Sleep -Seconds 1
    
    Write-Host "GitHubへの送信を開始します..." -ForegroundColor White
    git add $targetFile
    git commit -m "Auto-update topics via script"
    git push origin main
    
    Write-Host "送信が完了しました！サイトへの反映をお待ちください（1分程度）。" -ForegroundColor Green
    Write-Host "------------------------------------------"
}

Register-ObjectEvent $watcher "Changed" -Action $action | Out-Null

while ($true) {
    Start-Sleep -Seconds 5
}

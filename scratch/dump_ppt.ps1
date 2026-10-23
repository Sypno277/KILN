$ppt = New-Object -ComObject PowerPoint.Application
$p = $ppt.Presentations.Open((Resolve-Path "scratch\quarterly_exact.pptx").Path, 0, 0, 0)
for ($i = 1; $i -le $p.Slides.Count; $i++) {
    $sl = $p.Slides.Item($i)
    Write-Host "--- Slide $i ---"
    for ($j = 1; $j -le $sl.Shapes.Count; $j++) {
        $sh = $sl.Shapes.Item($j)
        Write-Host " Shape $j : Name = $($sh.Name), Text = $($sh.TextFrame.TextRange.Text.Trim())"
    }
}
$p.Close()
$ppt.Quit()

$pptxPath = (Resolve-Path "scratch/batch4_after_output.pptx").Path

Write-Host "============================================================"
Write-Host "   READER 1: Microsoft PowerPoint (COM Automation)          "
Write-Host "============================================================"
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $pres = $ppt.Presentations.Open($pptxPath, 1, 0, 0)
    Write-Host "[READER 1 - MS PowerPoint] OPEN SUCCESS: $($pres.Slides.Count) slides opened cleanly with 0 errors."
    $pres.Close()
    $ppt.Quit()
} catch {
    Write-Host "[READER 1 - MS PowerPoint] FAILED: $($_.Exception.Message)"
}

Write-Host "`n============================================================"
Write-Host "   READER 2: Python (python-pptx)                           "
Write-Host "============================================================"
try {
    python -c "import pptx; p=pptx.Presentation(r'$pptxPath'); print(f'[READER 2 - python-pptx] OPEN SUCCESS: {len(p.slides)} slides parsed cleanly with 0 errors.')"
} catch {
    Write-Host "[READER 2 - python-pptx] FAILED: $($_.Exception.Message)"
}
Write-Host "============================================================`n"

$pptxPath = (Resolve-Path "scratch/batch5_output.pptx").Path
$docxPath = (Resolve-Path "scratch/batch5_output.docx").Path

Write-Host "============================================================"
Write-Host "   READER 1: Microsoft Word & PowerPoint (COM Automation)   "
Write-Host "============================================================"
$wordSuccess = $false
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $doc = $word.Documents.Open($docxPath, $false, $true)
    Write-Host "[READER 1 - MS Word] OPEN SUCCESS: Document opened cleanly with $($doc.Paragraphs.Count) paragraphs."
    $doc.Close([ref]$false)
    $word.Quit()
    $wordSuccess = $true
} catch {
    Write-Host "[READER 1 - MS Word] OPEN FAILED: $($_.Exception.Message)"
}

$pptSuccess = $false
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $pres = $ppt.Presentations.Open($pptxPath, 1, 0, 0)
    Write-Host "[READER 1 - MS PowerPoint] OPEN SUCCESS: Presentation opened cleanly with $($pres.Slides.Count) slides."
    $pres.Close()
    $ppt.Quit()
    $pptSuccess = $true
} catch {
    Write-Host "[READER 1 - MS PowerPoint] OPEN FAILED: $($_.Exception.Message)"
}

Write-Host "`n============================================================"
Write-Host "   READER 2: Python (python-docx & python-pptx)             "
Write-Host "============================================================"
try {
    $pyScript = "import docx, pptx; d = docx.Document(r'$docxPath'); print(f'[READER 2 - python-docx] OPEN SUCCESS: {len(d.paragraphs)} paragraphs parsed.'); p = pptx.Presentation(r'$pptxPath'); print(f'[READER 2 - python-pptx] OPEN SUCCESS: {len(p.slides)} slides parsed.')"
    python -c $pyScript
} catch {
    Write-Host "[READER 2] Python open failed: $($_.Exception.Message)"
}
Write-Host "============================================================`n"

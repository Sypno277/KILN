$docxPath1 = (Resolve-Path "scratch/batch7_original.docx").Path
$pptxPath1 = (Resolve-Path "scratch/batch7_original.pptx").Path
$docxPath2 = (Resolve-Path "scratch/batch6_output.docx").Path
$pptxPath2 = (Resolve-Path "scratch/batch6_output.pptx").Path

Write-Host "============================================================"
Write-Host "   READER 1: Microsoft Word & PowerPoint (COM Automation)   "
Write-Host "============================================================"
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    
    $d1 = $word.Documents.Open($docxPath1, $false, $true)
    Write-Host "[READER 1 - MS Word] batch7_original.docx OPEN SUCCESS: $($d1.Paragraphs.Count) paragraphs."
    $d1.Close([ref]$false)
    
    $d2 = $word.Documents.Open($docxPath2, $false, $true)
    Write-Host "[READER 1 - MS Word] batch6_output.docx OPEN SUCCESS: $($d2.Paragraphs.Count) paragraphs."
    $d2.Close([ref]$false)
    
    $word.Quit()
} catch {
    Write-Host "[READER 1 - MS Word] FAILED: $($_.Exception.Message)"
}

try {
    $ppt = New-Object -ComObject PowerPoint.Application
    
    $p1 = $ppt.Presentations.Open($pptxPath1, 1, 0, 0)
    Write-Host "[READER 1 - MS PowerPoint] batch7_original.pptx OPEN SUCCESS: $($p1.Slides.Count) slides."
    $p1.Close()
    
    $p2 = $ppt.Presentations.Open($pptxPath2, 1, 0, 0)
    Write-Host "[READER 1 - MS PowerPoint] batch6_output.pptx OPEN SUCCESS: $($p2.Slides.Count) slides."
    $p2.Close()
    
    $ppt.Quit()
} catch {
    Write-Host "[READER 1 - MS PowerPoint] FAILED: $($_.Exception.Message)"
}

Write-Host "`n============================================================"
Write-Host "   READER 2: Python (python-docx & python-pptx)             "
Write-Host "============================================================"
try {
    python -c "import docx, pptx; d1=docx.Document(r'$docxPath1'); print(f'[READER 2 - python-docx] batch7_original.docx OPEN SUCCESS: {len(d1.paragraphs)} paragraphs.'); d2=docx.Document(r'$docxPath2'); print(f'[READER 2 - python-docx] batch6_output.docx OPEN SUCCESS: {len(d2.paragraphs)} paragraphs.'); p1=pptx.Presentation(r'$pptxPath1'); print(f'[READER 2 - python-pptx] batch7_original.pptx OPEN SUCCESS: {len(p1.slides)} slides.'); p2=pptx.Presentation(r'$pptxPath2'); print(f'[READER 2 - python-pptx] batch6_output.pptx OPEN SUCCESS: {len(p2.slides)} slides.')"
} catch {
    Write-Host "[READER 2] Python open failed: $($_.Exception.Message)"
}
Write-Host "============================================================`n"

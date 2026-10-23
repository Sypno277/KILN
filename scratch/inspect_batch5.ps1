$ErrorActionPreference = 'Stop'

Write-Host "=== INSPECTING POWERPOINT ==="
$ppt = New-Object -ComObject PowerPoint.Application
$pPath = (Resolve-Path "scratch\quarterly_exact.pptx").Path
$pres = $ppt.Presentations.Open($pPath, 0, 0, 0)
Write-Host "Slide Count: $($pres.Slides.Count)"
Write-Host "Slide Width: $($pres.PageSetup.SlideWidth) pt, Slide Height: $($pres.PageSetup.SlideHeight) pt, Orientation: $($pres.PageSetup.SlideOrientation)"
for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $s = $pres.Slides.Item($i)
    Write-Host "--- Slide $i ---"
    Write-Host "  Layout: $($s.Layout)"
    Write-Host "  Shapes Count: $($s.Shapes.Count)"
    for ($j = 1; $j -le $s.Shapes.Count; $j++) {
        $sh = $s.Shapes.Item($j)
        Write-Host "  Shape $j : Name='$($sh.Name)', Type=$($sh.Type), Left=$($sh.Left), Top=$($sh.Top), Width=$($sh.Width), Height=$($sh.Height)"
        if ($sh.HasTextFrame) {
            $tf = $sh.TextFrame
            Write-Host "    Autofit: $($tf.AutoSize), WordWrap: $($tf.WordWrap), MarginLeft=$($tf.MarginLeft), MarginTop=$($tf.MarginTop)"
            Write-Host "    Text: '$($tf.TextRange.Text.Replace("`r", " \r ").Replace("`n", " \n "))'"
            for ($p = 1; $p -le $tf.TextRange.Paragraphs().Count; $p++) {
                $para = $tf.TextRange.Paragraphs($p)
                Write-Host "      Para $p : Align=$($para.ParagraphFormat.Alignment), BulletType=$($para.ParagraphFormat.Bullet.Type), Text='$($para.Text.Trim())'"
            }
        }
    }
}
$pres.Close()
$ppt.Quit()

Write-Host "`n=== INSPECTING WORD ==="
$word = New-Object -ComObject Word.Application
$wPath = (Resolve-Path "scratch\quarterly_exact.docx").Path
$doc = $word.Documents.Open($wPath, 0, 1)
Write-Host "Paragraphs Count: $($doc.Paragraphs.Count)"
Write-Host "Page Setup: PageWidth=$($doc.PageSetup.PageWidth), PageHeight=$($doc.PageSetup.PageHeight), Orientation=$($doc.PageSetup.Orientation)"
Write-Host "Margins: TopMargin=$($doc.PageSetup.TopMargin), BottomMargin=$($doc.PageSetup.BottomMargin), LeftMargin=$($doc.PageSetup.LeftMargin), RightMargin=$($doc.PageSetup.RightMargin)"
for ($p = 1; $p -le $doc.Paragraphs.Count; $p++) {
    $para = $doc.Paragraphs.Item($p)
    $styleName = $para.Style.NameLocal
    Write-Host "  Para $p : Style='$styleName', Align=$($para.Alignment), LeftIndent=$($para.LeftIndent), Text='$($para.Range.Text.Trim())'"
}
$doc.Close(0)
$word.Quit()

Write-Host "`n=== INSPECTING EXCEL ==="
$excel = New-Object -ComObject Excel.Application
$xPath = (Resolve-Path "scratch\quarterly_exact.xlsx").Path
$wb = $excel.Workbooks.Open($xPath)
$ws = $wb.Sheets.Item(1)
Write-Host "UsedRange: $($ws.UsedRange.Address)"
Write-Host "Columns Count: $($ws.UsedRange.Columns.Count), Rows Count: $($ws.UsedRange.Rows.Count)"
for ($r = 1; $r -le 10; $r++) {
    $valA = $ws.Cells.Item($r, 1).Text
    $valB = $ws.Cells.Item($r, 2).Text
    $numFmtA = $ws.Cells.Item($r, 1).NumberFormat
    $numFmtB = $ws.Cells.Item($r, 2).NumberFormat
    Write-Host "  Row $r : [Col A]='$valA' (Fmt: $numFmtA) | [Col B]='$valB' (Fmt: $numFmtB)"
}
$wb.Close(0)
$excel.Quit()

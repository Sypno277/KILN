$ErrorActionPreference = 'Stop'
$ppt = New-Object -ComObject PowerPoint.Application
$pPath = (Resolve-Path "scratch\quarterly_exact.pptx").Path
$pres = $ppt.Presentations.Open($pPath, 0, 0, 0)
Write-Host "PowerPoint: OK! Slides Count: $($pres.Slides.Count)"
Write-Host "Slide 1 Title: $($pres.Slides.Item(1).Shapes.Title.TextFrame.TextRange.Text)"
Write-Host "Slide 2 Title: $($pres.Slides.Item(2).Shapes.Title.TextFrame.TextRange.Text)"
$pres.Close()
$ppt.Quit()

$word = New-Object -ComObject Word.Application
$wPath = (Resolve-Path "scratch\quarterly_exact.docx").Path
$doc = $word.Documents.Open($wPath, 0, 1)
Write-Host "Word: OK! Paragraphs Count: $($doc.Paragraphs.Count)"
Write-Host "Doc Heading 1: $($doc.Paragraphs.Item(1).Range.Text.Trim())"
Write-Host "Doc Heading 2: $($doc.Paragraphs.Item(6).Range.Text.Trim())"
$doc.Close(0)
$word.Quit()

$excel = New-Object -ComObject Excel.Application
$xPath = (Resolve-Path "scratch\quarterly_exact.xlsx").Path
$wb = $excel.Workbooks.Open($xPath)
Write-Host "Excel: OK! Sheet Name: $($wb.Sheets.Item(1).Name)"
Write-Host "Cell A1: $($wb.Sheets.Item(1).Range('A1').Value2)"
Write-Host "Cell A3: $($wb.Sheets.Item(1).Range('A3').Value2)"
Write-Host "Cell B3: $($wb.Sheets.Item(1).Range('B3').Value2)"
$wb.Close(0)
$excel.Quit()

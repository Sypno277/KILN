$ErrorActionPreference = 'Stop'
try {
  $word = New-Object -ComObject Word.Application
  $filePath = (Resolve-Path ".\test-sample.docx").Path
  $doc = $word.Documents.Open($filePath, 0, 1) # ReadOnly
  Write-Host "SUCCESS! Word opened document cleanly! Paragraphs count: $($doc.Paragraphs.Count)"
  $doc.Close(0)
  $word.Quit()
} catch {
  Write-Error $_.Exception.Message
  if ($word) { $word.Quit() }
}

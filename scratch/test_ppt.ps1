$ErrorActionPreference = 'Stop'
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $filePath = (Resolve-Path ".\test-out.pptx").Path
  $pres = $ppt.Presentations.Open($filePath, 0, 0, 0)
  Write-Host "SUCCESS! PowerPoint opened presentation cleanly! Slides count: $($pres.Slides.Count)"
  $pres.Close()
  $ppt.Quit()
} catch {
  Write-Error $_.Exception.Message
  if ($ppt) { $ppt.Quit() }
}

$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Add(0)
$slide = $pres.Slides.Add(1, 1)
$dest = (Resolve-Path ".").Path + "\scratch\official_minimal.pptx"
$pres.SaveAs($dest)
$pres.Close()
$ppt.Quit()
Write-Host "Generated official PPTX at: $dest"

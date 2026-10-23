$pptxPath = (Resolve-Path "scratch/batch6_output.pptx").Path
$outPng = (Resolve-Path "scratch").Path + "\pptx_slide1_render.png"

$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open($pptxPath, 1, 0, 0)
$slide = $pres.Slides.Item(1)
$slide.Export($outPng, "PNG", 1275, 1650)
$pres.Close()
$ppt.Quit()

Write-Host "Exported slide to: $outPng"

$ErrorActionPreference = 'Stop'
try {
    $pptxPath = (Resolve-Path "scratch/output_week1.pptx").Path
    $outPng = (Resolve-Path "scratch").Path + "\output_week1_pptx_slide1.png"

    $ppt = New-Object -ComObject PowerPoint.Application
    $pres = $ppt.Presentations.Open($pptxPath, 1, 0, 0)
    $slide = $pres.Slides.Item(1)
    $slide.Export($outPng, "PNG", 1275, 1650)
    $pres.Close()
    $ppt.Quit()

    Write-Output "SUCCESS: Exported PPTX slide 1 to $outPng"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}

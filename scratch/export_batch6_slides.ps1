
    $ErrorActionPreference = 'Stop'
    try {
        $pptxPath = (Resolve-Path 'scratch/output_week1.pptx').Path
        $ppt = New-Object -ComObject PowerPoint.Application
        $pres = $ppt.Presentations.Open($pptxPath, 1, 0, 0)
        for ($i = 1; $i -le $pres.Slides.Count; $i++) {
            $outPng = (Resolve-Path 'scratch').Path + "\batch6_pptx_slide$i.png"
            $pres.Slides.Item($i).Export($outPng, 'PNG', 1275, 1650)
        }
        $pres.Close()
        $ppt.Quit()
        Write-Output "SUCCESS"
    } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
    }
    
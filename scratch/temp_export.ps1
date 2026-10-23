
    $pptx = (Resolve-Path 'scratch/batch6_output.pptx').Path
    $out = (Resolve-Path 'scratch').Path + '\pptx_slide1_render.png'
    $ppt = New-Object -ComObject PowerPoint.Application
    $pres = $ppt.Presentations.Open($pptx, 1, 0, 0)
    $slide = $pres.Slides.Item(1)
    $slide.Export($out, 'PNG', 1275, 1650)
    $pres.Close()
    $ppt.Quit()
    
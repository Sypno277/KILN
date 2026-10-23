
$pptxPath = 'D:\My Projects\Filee\scratch\batch4_after_output.pptx'
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open($pptxPath, 1, 0, 0)
$pres.Slides.Item(1).Export((Resolve-Path 'scratch').Path + '\batch4_pptx_slide1.png', 'PNG', 1275, 1650)
$pres.Slides.Item(2).Export((Resolve-Path 'scratch').Path + '\batch4_pptx_slide2.png', 'PNG', 1275, 1650)
$pres.Close()
$ppt.Quit()

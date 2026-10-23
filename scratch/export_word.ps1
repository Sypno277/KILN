
 = New-Object -ComObject Word.Application
.Visible = False
 = (Resolve-Path 'scratch/batch2_output.docx').Path
 = (Resolve-Path 'scratch').Path + '\docx_from_word.pdf'
 = .Documents.Open(, False, True)
.ExportAsFixedFormat(, 17)
.Close([ref]False)
.Quit()
Write-Output 'DOCX exported to PDF successfully.'

$ErrorActionPreference = 'Stop'
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $docPath = (Resolve-Path 'scratch/batch3_output.docx').Path
    $pdfPath = [System.IO.Path]::GetFullPath('scratch/batch3_docx_rendered.pdf')
    $doc = $word.Documents.Open($docPath, $false, $true)
    $doc.ExportAsFixedFormat($pdfPath, 17) # 17 = wdExportFormatPDF
    $doc.Close([ref]$false)
    $word.Quit()
    Write-Output "SUCCESS"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}

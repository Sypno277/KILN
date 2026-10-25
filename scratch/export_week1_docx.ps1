$ErrorActionPreference = 'Stop'
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $docPath = (Resolve-Path 'scratch/output_week1.docx').Path
    $pdfPath = [System.IO.Path]::GetFullPath('scratch/output_week1_docx_rendered.pdf')
    $doc = $word.Documents.Open($docPath, $false, $true)
    $doc.ExportAsFixedFormat($pdfPath, 17) # 17 = wdExportFormatPDF
    $doc.Close([ref]$false)
    $word.Quit()
    Write-Output "SUCCESS: Exported DOCX to $pdfPath"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}

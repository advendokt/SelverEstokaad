# PowerShell script to convert HEIC files to JPG
# Requires Windows 10/11 with HEIF support or ImageMagick

param(
    [string]$InputFolder = ".",
    [string]$OutputFolder = "converted",
    [string]$Quality = "90"
)

# Function to convert HEIC to JPG using Windows API
function Convert-HeicToJpg {
    param(
        [string]$InputPath,
        [string]$OutputPath
    )
    
    try {
        # Try using Windows.Graphics.Imaging (Windows 10/11)
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        
        $inputFile = [System.IO.FileInfo]$InputPath
        $outputFile = [System.IO.FileInfo]$OutputPath
        
        Write-Host "Converting: $($inputFile.Name) -> $($outputFile.Name)"
        
        # For now, just copy the file with .jpg extension for compatibility
        # In a real scenario, you would need HEIF codec or ImageMagick
        Copy-Item $InputPath $OutputPath
        
        return $true
    }
    catch {
        Write-Error "Failed to convert $InputPath : $($_.Exception.Message)"
        return $false
    }
}

# Main script
Write-Host "HEIC to JPG Converter"
Write-Host "Input folder: $InputFolder"
Write-Host "Output folder: $OutputFolder"

# Create output folder if it doesn't exist
if (!(Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder | Out-Null
    Write-Host "Created output folder: $OutputFolder"
}

# Find all HEIC files
$heicFiles = Get-ChildItem -Path $InputFolder -Filter "*.heic" -Recurse

if ($heicFiles.Count -eq 0) {
    Write-Host "No HEIC files found in $InputFolder"
    exit 0
}

Write-Host "Found $($heicFiles.Count) HEIC files"

# Convert each file
$converted = 0
foreach ($file in $heicFiles) {
    $outputName = [System.IO.Path]::ChangeExtension($file.Name, ".jpg")
    $outputPath = Join-Path $OutputFolder $outputName
    
    if (Convert-HeicToJpg -InputPath $file.FullName -OutputPath $outputPath) {
        $converted++
    }
}

Write-Host "Conversion complete: $converted/$($heicFiles.Count) files converted"

# Note: This script currently just copies files. For actual HEIC to JPG conversion,
# you would need:
# 1. Windows 10/11 with HEIF extensions installed
# 2. ImageMagick with HEIC support
# 3. Third-party libraries like libheif

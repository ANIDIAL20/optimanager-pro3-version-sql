# PowerShell script to find all remaining Loader2 imports
Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" | 
  Where-Object { $_.FullName -notmatch "node_modules" } |
  ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "import.*Loader2.*from\s+['\"]lucide-react['\"]") {
      Write-Host $_.FullName
    }
  }

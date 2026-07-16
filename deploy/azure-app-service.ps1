param(
  [Parameter(Mandatory = $true)]
  [string]$AppName,

  [Parameter(Mandatory = $true)]
  [string]$ResourceGroup,

  [string]$Location = "eastus",
  [string]$Sku = "F1"
)

$ErrorActionPreference = "Stop"

Write-Host "Checking Azure CLI sign-in..."
az account show | Out-Null

$secureToken = Read-Host "Enter the private ADMIN_TOKEN for song editing" -AsSecureString
$adminTokenPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $adminToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminTokenPtr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminTokenPtr)
}

if([string]::IsNullOrWhiteSpace($adminToken)) {
  throw "ADMIN_TOKEN cannot be empty."
}

Write-Host "Creating or updating resource group '$ResourceGroup'..."
az group create `
  --name $ResourceGroup `
  --location $Location `
  | Out-Null

Write-Host "Creating or updating Azure App Service '$AppName'..."
az webapp up `
  --name $AppName `
  --resource-group $ResourceGroup `
  --location $Location `
  --sku $Sku

Write-Host "Configuring app settings..."
az webapp config appsettings set `
  --name $AppName `
  --resource-group $ResourceGroup `
  --settings `
    NODE_ENV=production `
    SONGS_FILE=/home/data/worship-songs.json `
    SCM_DO_BUILD_DURING_DEPLOYMENT=true `
    ADMIN_TOKEN="$adminToken" `
  | Out-Null

Write-Host "Configuring startup command..."
az webapp config set `
  --name $AppName `
  --resource-group $ResourceGroup `
  --startup-file "npm start" `
  | Out-Null

Write-Host "Restarting app..."
az webapp restart --name $AppName --resource-group $ResourceGroup | Out-Null

Write-Host "Deployment configured: https://$AppName.azurewebsites.net"

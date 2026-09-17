# Run this script once as Administrator so your phone can connect to Expo
# when using LAN mode (npm run start:lan or npm run start:clear:lan).
# Right-click PowerShell -> Run as Administrator, then:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   cd "path\to\CaviTour"
#   .\scripts\allow-expo-firewall.ps1

$ruleName = "Expo Metro (Tara, Cavite!)"
$port = 8081

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Rule '$ruleName' already exists. Nothing to do."
    exit 0
}

New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Private
Write-Host "Added firewall rule for port $port. You can now use npm run start:lan when phone and PC are on the same Wi-Fi."

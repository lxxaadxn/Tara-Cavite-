@echo off
:: Run as Administrator (right-click -> Run as administrator) so phone can connect in LAN mode.
netsh advfirewall firewall add rule name="Expo Metro (CaviTour)" dir=in action=allow protocol=TCP localport=8081
echo Done. You can use npm run start:lan when phone and PC are on the same Wi-Fi.

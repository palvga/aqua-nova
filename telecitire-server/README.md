# AQUA-NOVA — recepție telecitire DN80

Server Node.js 24, fără dependințe externe, SQLite persistent. Frontendul `contoare.html` este publicat separat pe GitHub Pages. GitHub Pages NU execută acest server.

## Pornire

În directorul telecitire-server, configurați variabilele de mediu prin serviciul de găzduire sau PowerShell:

```powershell
$env:OPERATOR_TOKEN = '<token aleator de minimum 24 caractere>'
$env:DEVICE_TOKENS_JSON = '{"DN80-001":"<token dispozitiv distinct de minimum 24 caractere>"}'
$env:ALLOWED_ORIGIN = 'https://palvga.github.io'
node server.mjs
```

Serverul ascultă implicit numai pe 127.0.0.1:8781. Pentru utilizare online instalați-l pe VPS cu volum persistent, reverse proxy HTTPS, backup SQLite și restart automat. Nu expuneți HTTP necriptat. Nu publicați tokenuri, fișiere SQLite sau configurații cu secrete. `DB_PATH`, `PORT`, `HOST` sunt opționale. Copia SQLite se face cu mecanisme SQLite backup sau după oprirea serviciului (inclusiv WAL).

Token operator: acces la registru și adăugare contoare. Token separat pe contor: exclusiv recepție citiri pentru acel ID. Tokenul operator se introduce în pagina de configurare și rămâne în memoria tabului, fără localStorage. Schimbarea tokenurilor necesită restartul serverului. Serverul nu oferă încă gestiune de utilizatori/roluri, rate limiting distribuit sau adaptor HWM nativ; se dimensionează și se configurează aceste elemente înaintea operării la scară.

## Contract API

Toate apelurile folosesc `Authorization: Bearer TOKEN`. POST folosește `Content-Type: application/json`.

- GET /api/meters: registrul și ultimele 1000 citiri pe contor, sortate temporal. Istoricul complet este păstrat în SQLite; exportul din interfață include datele încărcate (maximum 1000 citiri/contor).
- POST /api/meters: token operator; corp `{ "id":"DN80-001", "name":"Intrare sector", "transport":"GSM", "lat":46.64, "lng":27.73, "baseline":1234.56, "limit":25 }`.
- POST /api/readings: tokenul contorului; corp `{ "meterId":"DN80-001", "eventId":"logger1-000001", "timestamp":"2026-10-10T08:00:00Z", "pulses":0, "battery":95 }`.

`baseline` este indexul mecanic la pornirea sesiunii de numărare. `pulses` este numărul cumulativ de impulsuri de la acel moment, nu totalul pe interval. Dacă loggerul raportează un contor cumulativ care nu începe la zero, adaptorul scade valoarea de referință de la instalare. `eventId` rămâne identic la retransmisie. Pentru loturi se trimit individual evenimentele cu timpul original al măsurării. Citirile întârziate sunt acceptate când valoarea cumulativă rămâne compatibilă cu vecinii temporali. Duplicatele identice sunt idempotente; scăderea impulsurilor și reutilizarea eventId cu alte date sunt respinse. Resetarea sau înlocuirea loggerului necesită un nou ID de sesiune/contor și un nou baseline, fără combinarea seriilor.

Volum = impulsuri × 0,01 m³. Debit mediu = diferență volum / diferență timp în ore. Primul eșantion nu produce debit. Timestamps stocate în UTC, interfața afișează Europe/Bucharest.

## Google Maps

Activați Maps JavaScript API în Google Cloud, configurați facturarea, cheia restricționată la domeniul site-ului și Map ID pentru advanced markers. Cheia Maps pentru browser este vizibilă prin natura API-ului: restricționați-o pe domeniu/API și setați cote. Introduceți cheia și Map ID în pagina de configurare; se păstrează doar în browserul respectiv. Fără cheie, detaliile contorului oferă hartă Google încorporată și link la coordonate; harta comună cu toate markerele nu este activă.

Documentație: https://developers.google.com/maps/documentation/javascript/get-api-key și https://developers.google.com/maps/documentation/javascript/advanced-markers/start

## Echipamente propuse

B METERS WDE-K50 DN80 + IWM-PL4 configurat la 10 L/impuls; consultați Aqualine România pentru varianta DN80: https://www.aqualine.ro/contoare-si-debitmetre/contor-industrial-de-apa-rece-b-meters-tip-wde-k50-663.html

HWM MultiLog 2, modem celular și intrare de impuls, prin Envirotronic: https://envirotronic.ro/datalogger-multilog2/

Configurație de proiectare, nu certificare a ansamblului: confirmați în ofertă compatibilitatea open collector polarizat, cablarea, ponderarea impulsului, modemul/SIM, protocolul și accesul DataGate/server. Adaptorul furnizorului se implementează după documentația sa; loggerul nu trebuie presupus capabil să emită direct JSON-ul AQUA-NOVA. Modulul IWM-PL4 trebuie configurat prin NFC; manual: https://www.bmeters.com/wp-content/uploads/2023/07/v1.3_IWM-PL4_QUG_EN.pdf

Înregistrare propusă 15 minute, transmisie 60 minute; verificare 100 impulsuri = 1 m³. Pragurile de debit se stabilesc după profilul instalației. Înregistrarea GPS este în formular sau click pe harta comună; coordonatele din demonstrație sunt exemple.

## Verificare

`node --test server.test.mjs`

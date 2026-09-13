# AQUA NOVA

Site de prezentare pentru o companie de automatizări dedicate captării, tratării și distribuției apei.

## Publicare pe GitHub Pages

1. Creează un repository nou pe GitHub, de exemplu `aqua-nova`.
2. Repository-ul local este deja inițializat pe ramura `main`. Din acest director, creează primul commit și încarcă proiectul:

   ```powershell
   git add .
   git commit -m "Initial AQUA NOVA website"
   git branch -M main
   git remote add origin https://github.com/UTILIZATOR/aqua-nova.git
   git push -u origin main
   ```

3. În repository-ul GitHub, intră la **Settings → Pages** și, la **Build and deployment**, selectează **GitHub Actions**.
4. După rularea workflow-ului, site-ul va fi disponibil la:

   `https://UTILIZATOR.github.io/aqua-nova/`

Fiecare actualizare trimisă pe ramura `main` va republica automat site-ul.

## Rulare locală

Deschide `index.html` într-un browser sau servește directorul printr-un server static local.

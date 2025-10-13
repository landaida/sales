https://script.google.com/macros/s/AKfycbxawm5UCRYvNcZTDmAAZei97gS8cZttOuJKQUetkjdbZZSNVZvbRRAn71TGhWeWAJYv/exec?action=dashboard

https://script.google.com/macros/s/AKfycbxawm5UCRYvNcZTDmAAZei97gS8cZttOuJKQUetkjdbZZSNVZvbRRAn71TGhWeWAJYv/exec?action=products


http://localhost:5173/gsapi?action=dashboard
http://localhost:5173/gsapi?action=products

fetch('/gsapi?action=products').then(r=>r.json()).then(console.log)

cd ui
rm -rf .vite dist
cp .env.example .env
npm i
npm run dev


```
Requisitos (no negociables)
1. Entrega del código
En cada interacción, envía todo el source code completo en un .zip (sin node_modules ni archivos que no sean código) e incluye siempre apps-scripts.
No preguntes si quiero el zip: envíalo siempre.
Para evitar conflictos de nombre/links, el archivo debe terminar con timestamp en milisegundos antes de .zip (ej.: ventas-...-v13.1-1759965006744.zip).
2. No remover features
Nunca elimines una feature que ya existía a menos que yo lo pida explícitamente. Enfócate en corregir o agregar, no en quitar.
3. Estabilidad y no regresiones
Si algo ya funcionaba, no propongas cambios que no solucionen el problema y además rompan lo existente.
Aplica cambios mínimos y focalizados, evitando reescrituras/refactors innecesarios de una interacción a otra.
Si hay funciones nuevas poner las mimsas en la parte inferior del file a modificar, de esta forma es más fácil entender lo nuevo de lo que ya existía y permanece igual y de lo que existía y sufrió un cambio.
4. Pruebas obligatorias
Siempre incluye tests que validen lo que propones y comprueben que no hay regresiones.
5. Idioma
Comentarios en el código siempre en English.
En el chat, usa el idioma en el que te escribo.
6. Referencia base
Toma combined.txt como resumen/base del source para evitar dudas.
```




> combined.txt

find . -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/temp/*" \
  -not -path "*/dist/*" \
  -not -path "*/bkp/*" \
  -not -path "*/.git/*" \
  -not -path "*/__pycache__/*" \
  -not -name "*.txt" \
  -not -name "package-lock.json" \
  -not -name "*.tar.gz" \
  -not -name "*.zip" \
  -not -name "*.xlsx" \
  -not -name "*example*" \
  -not -name "*.pt" \
  -not -name "*.png" \
  -not -name "*.xpi" \
  -not -name "*.log" \
  -not -name "*.md" \
| while read -r file; do
  echo '' >> combined.txt
  echo "===== $file =====" >> combined.txt
  cat "$file" >> combined.txt
  echo -e "\n\n\`\`\`" >> combined.txt
done
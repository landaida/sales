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
Requerido y no negociable 
1- siempre prefiero que empaques todo el proyecto completo, sin node_modules o cualquier cosa que no sea el source code, siempre el source code entero, otra cosa referente al mismo punto, hay veces que al final no me envías el source code zipeado y me volves a preguntar si quiero el zip del source code, y la respuesta es sí, y siempre a cada interacción y también añade apps-scripts siempre, para evitar problemas de link inválidos o expirados con nombres iguales has que ante de la extension .zip tenga el datetime en millisegundos, por ejemplo "ventas-....-v13.1-1759965006744.zip".
2- no puedes remover una feature entre una version anterior y la otra a no ser que yo lo solicite explicitamente, simplemente enfocate en resolver o agregar y jamás remover algo que sí estaba en mis requisitos.
3- Si algo ya estaba funcionando no me sugieras algo que a parte de que no corrija el error que te estoy pasando también afecté a lo que ya estaba funcionando. 
4- Comentarios dentro del source code siempre en English pero en el chat depende de que idioma estoy usando para comunicarme contigo. 
5- Has siempre pruebas para corroborar lo que estas sugiriendo para evitar idas y vueltas innecesarias.
6- Para que no tengas duda te adjunto el source code resumido en el file `combined.txt`.
```
La verdad estoy es critico, no puedes cambiar el código a cada interacción que tengamos.




> combined.txt

find . -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/temp/*" \
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
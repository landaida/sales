https://script.google.com/macros/s/AKfycbxawm5UCRYvNcZTDmAAZei97gS8cZttOuJKQUetkjdbZZSNVZvbRRAn71TGhWeWAJYv/exec?action=dashboard

https://script.google.com/macros/s/AKfycbxawm5UCRYvNcZTDmAAZei97gS8cZttOuJKQUetkjdbZZSNVZvbRRAn71TGhWeWAJYv/exec?action=products

https://script.google.com/macros/s/AKfycbxawm5UCRYvNcZTDmAAZei97gS8cZttOuJKQUetkjdbZZSNVZvbRRAn71TGhWeWAJYv/exec?action=stockfast&cursor=0&limit=5&showWithoutStock=false

https://script.google.com/macros/s/AKfycbxawm5UCRYvNcZTDmAAZei97gS8cZttOuJKQUetkjdbZZSNVZvbRRAn71TGhWeWAJYv/exec?action=receipts_history



http://localhost:5173/gsapi?action=dashboard
http://localhost:5173/gsapi?action=products

fetch('/gsapi?action=products').then(r=>r.json()).then(console.log)

cd ui
rm -rf .vite dist
cp .env.example .env
npm i
npm run dev


```
**Requisitos (no negociables) — actualizado**

1. **Entrega del código**

* En **cada interacción**, envía **todo el source code completo** en un **.zip** (sin `node_modules` ni archivos que no sean código) e **incluye siempre `apps-scripts`**.
* **No preguntes** si quiero el zip: **envíalo siempre**.
* El archivo debe terminar con **timestamp en milisegundos** antes de `.zip` (ej.: `ventas-...-v13.1-1759965006744.zip`), asegurate que no ocurran errores frecuentes con el zip como `Code interpreter session expired`, `File not found` y otros, hay veces que me pasas solo texto y no es un link.
* Me gustaría que muestres el nuevo código sugerido, en qué archivo ponerlo o dónde editar, muestra el código detalladamente.
2. **No remover features**

* **No elimines** una feature existente salvo que yo lo pida explícitamente. Enfócate en **corregir o agregar**, no en quitar.

3. **Estabilidad y no regresiones**

* Si algo ya funcionaba, **no propongas cambios** que no solucionen el problema y además rompan lo existente.
* Cambios **mínimos y focalizados**; evita refactors o reescrituras innecesarias entre versiones.

4. **Pruebas obligatorias**

* **Siempre** incluye **tests** que validen lo nuevo y que **prevengan regresiones**.

5. **Idioma**

* **Comentarios en el código**: siempre en **English**.
* **Chat**: en el **idioma en el que te escribo**.

6. **Referencia base**

* Te paso siempre **`combined.txt`** para que lo uses como **resumen/base** del source para evitar que tengas dudas.

7. **Consistencia de nombres y contratos (API stability)**

* **No renombres** funciones ni helpers ya entregados ni cambies sus firmas (parámetros/orden/retorno) **sin necesidad estricta**.
* **No alteres la funcionalidad** si no es imprescindible para el fix solicitado.
* Mantén **nombres estables** en helpers (ej.: usa siempre `sheetByName_`, **no** alternes con `sh_`).
* Si un cambio es inevitable:
  a) **Justifica** el motivo en el chat,
  b) provee **alias/compatibilidad** temporal (wrapper) manteniendo el nombre previo,
  c) marca el anterior como **deprecated** en comentarios (en English),
  d) agrega **tests de compatibilidad** (mismo input → mismo output/efecto).
* **Minimiza el diff** (nada de renombrar variables/funciones por estilo si no se pidió).
* **Minimiza el diff** (no mover la function de lugar en el archivo o en archivos diferentes, estás moviendo siempre functions de archivos especificos como StockWritePatch.gs a Code.gs, lo hiciste varias veces con `applySaleToStock_`).
* ***Obviamente que siempre prefiero nombres como `sheetByName_`, `ensureProductRow_` y sin la necesidad que todos esten en `Code.gs`, podrian estar en otras clases helpers.
* En este punto me encanta cuando me pides que modifique en lo mínimo archivos extensos como Code.gs y me mandas patches como CajaReceivablesPatch.gs,excelente idea y solución para minimizar el diff.
```




> combined.txt

find . -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/temp/*" \
  -not -path "*/dist/*" \
  -not -path "*/.github/*" \
  -not -path "*/.vscode/*" \
  -not -path "*/bkp/*" \
  -not -path "*/.git/*" \
  -not -path "*/__pycache__/*" \
  -not -name "*.txt" \
  -not -name "package-lock.json" \
  -not -name "*.tar.gz" \
  -not -name "*.zip" \
  -not -name "*.npmrc" \
  -not -name "*.gitignore" \
  -not -name "*package.json" \
  -not -name "*LICENSE" \
  -not -name "*deploy.sh" \
  -not -name "*.env*" \
  -not -name "*vite.config.ts" \
  -not -name "*tsconfig.json" \
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



# google app scripts CLI
# push and deploy 
npx clasp push
npx clasp version "deploy $(date +%F_%T)"
DEPLOY_ID=$(cat .deployid)
npx clasp deploy --deploymentId "$DEPLOY_ID" --description "redeploy $(date +%F_%T)"

# see existing versions 
npx clasp deployments
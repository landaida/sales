# Ventas Simple — slim (sin node_modules)

- **No features removed.** This build only fixes the dev proxy (Vite) so GET actions stop returning `unknown action` and restores the OCR debug log.
- **English comments only in source** as requested.

## Dev setup
1) Edit `.env` and put your `VITE_GAS_DEPLOYMENT_ID` (Apps Script *Deployment ID*).
2) `cd ui && npm i && npm run dev` (node_modules are intentionally excluded from this zip).
3) Open `http://localhost:5173`. The proxy `/gsapi` keeps the query string intact.

## Apps Script
- Upload **apps-script/Code.gs** and **apps-script/UploadOCR.gs** into the same project.
- Enable **Drive API** in *Services*.
- Deploy the Web App again.

## Quick self-tests
- GET: open the browser console and run:
  `fetch('/gsapi?action=cashbox&key=dev-key').then(r=>r.json()).then(console.log)`
  You should get totals, not `unknown action`.
- POST: run
  `fetch('/gsapi', {method:'POST', body: JSON.stringify({action:'uploadpdf', key:'dev-key'})}).then(r=>r.json()).then(console.log)`
  You should get `{ ok:false, error:'missing b64' }`.

## OCR
When **Debug OCR** is checked in the UI, the server returns a `sample` field with the raw text and the UI prints:
`OCR sample: ...` in the DevTools console.

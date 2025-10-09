# Ventas Simple v10.5 (fix POST redirect)

**What’s fixed**: uploading a purchase PDF from the PWA returned *unknown action* because
Google Apps Script returns **302** to `script.googleusercontent.com`; browsers turn the
original **POST** into **GET** on redirect, so `doGet` ran with no `action`.
The UI now detects the 302 in dev (`/gsapi`), follows the `Location` and re‑POSTs
to the final URL, so `doPost` receives the JSON body.

## How to run (dev)
1) In Apps Script: copy `apps-script/Code.gs` and `apps-script/UploadOCR.gs` into your project.
   Enable **Advanced Google Services → Drive API**. Deploy the web app and copy the
   *Deployment ID* (looks like `AKfycb...`).
2) In `ui/.env` set:
```
VITE_API_BASE=/gsapi
VITE_GAS_DEPLOYMENT_ID=<YOUR DEPLOYMENT ID>
VITE_API_KEY=dev-key
```
3) `cd ui && npm i && npm run dev`. Open http://localhost:5173

## Build (prod)
Set `VITE_API_BASE` to your full web‑app URL ending in `/exec`, keep `VITE_API_KEY`,
and `npm run build`.

All code comments are **English**; features from previous versions remain intact.

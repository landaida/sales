function __scopesPing(){
  // Toca Drive para forzar el consent
  DriveApp.getRootFolder().getName();
  // Y Sheets por si acaso (ya lo usas)
  SpreadsheetApp.getActive();
}

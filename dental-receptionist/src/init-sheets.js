/**
 * One-time script to initialize Google Sheets with required tabs and headers.
 * Run: node src/init-sheets.js
 */
require('dotenv').config();
const sheetsService = require('./services/sheetsService');

(async () => {
  console.log('🔧 Initializing Google Sheets...\n');
  await sheetsService.initializeSheets();
  console.log('\n✅ Done! You can now start the server.');
})();

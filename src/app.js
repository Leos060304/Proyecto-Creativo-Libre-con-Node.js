require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const expenseController = require('./controllers/expense.controller');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: path.join(__dirname, '../storage/inbox') });

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Servidor de Gestión de Gastos Activo 🚀',
    endpoints: [
      'POST /api/expenses/upload - Subir comprobante PDF',
      'GET /api/expenses/summary?year=YYYY&month=MM - Obtener resumen'
    ]
  });
});

app.post('/api/expenses/upload', upload.single('receipt'), expenseController.uploadReceipt);
app.get('/api/expenses/summary', expenseController.getMonthlySummary);

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
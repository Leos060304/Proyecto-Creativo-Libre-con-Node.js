require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const expenseController = require('./controllers/expense.controller');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: path.join(__dirname, '../storage/inbox') });

app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Endpoints
app.post('/api/expenses/upload', upload.single('receipt'), expenseController.uploadReceipt);
app.post('/api/expenses/manual', expenseController.createExpenseManual);
app.put('/api/expenses/:id', expenseController.updateExpense);
app.get('/api/expenses/summary', expenseController.getMonthlySummary);
app.get('/api/expenses/export/excel', expenseController.exportToExcel);

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
app.delete('/api/expenses/:id', expenseController.deleteExpense);
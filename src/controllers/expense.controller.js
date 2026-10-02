const fileOrganizerService = require('../services/fileOrganizer.service');
const ocrParserService = require('../services/ocrParser.service');
const fs = require('fs/promises');
const path = require('path');
const ExcelJS = require('exceljs');

const dbPath = path.join(__dirname, '../../storage/expenses.json');

async function getExpensesDB() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveExpensesDB(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

exports.uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha adjuntado ningún archivo.' });
    }

    const parsedData = await ocrParserService.parseReceipt(req.file.path);
    const finalPath = await fileOrganizerService.organizeFile(
      req.file.path,
      req.file.originalname,
      parsedData.date
    );

    const record = {
      id: Date.now().toString(),
      type: 'gasto', 
      ...parsedData,
      filePath: finalPath,
      uploadedAt: new Date().toISOString()
    };

    const currentExpenses = await getExpensesDB();
    currentExpenses.push(record);
    await saveExpensesDB(currentExpenses);

    res.status(201).json({ message: 'Comprobante procesado exitosamente.', data: record });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar el archivo.', details: error.message });
  }
};

exports.createExpenseManual = async (req, res) => {
  try {
    const { type, vendor, amount, category, date } = req.body;
    const currentExpenses = await getExpensesDB();

    const record = {
      id: Date.now().toString(),
      type: type || 'gasto', 
      vendor: vendor || 'Movimiento manual',
      amount: Number(amount) || 0,
      currency: 'MXN',
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'Otros',
      filePath: null,
      uploadedAt: new Date().toISOString()
    };

    currentExpenses.push(record);
    await saveExpensesDB(currentExpenses);

    res.status(201).json({ message: 'Registro agregado exitosamente.', data: record });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el registro.' });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, vendor, amount, category, date } = req.body;
    let currentExpenses = await getExpensesDB();

    const index = currentExpenses.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Registro no encontrado.' });
    }

    currentExpenses[index] = {
      ...currentExpenses[index],
      type: type ?? (currentExpenses[index].type || 'gasto'),
      vendor: vendor ?? currentExpenses[index].vendor,
      amount: amount !== undefined ? Number(amount) : currentExpenses[index].amount,
      category: category ?? currentExpenses[index].category,
      date: date ?? currentExpenses[index].date
    };

    await saveExpensesDB(currentExpenses);
    res.json({ message: 'Registro actualizado correctamente.', data: currentExpenses[index] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el registro.' });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    const expenses = await getExpensesDB();

    const filtered = expenses.filter(exp => {
      if (!exp.date) return false;
      const [expYear, expMonth] = exp.date.split('-');
      return (!year || expYear === year) && (!month || expMonth === month.padStart(2, '0'));
    });

    let totalIncome = 0;
    let totalExpenses = 0;

    filtered.forEach(item => {
      const amt = Number(item.amount) || 0;
      if (item.type === 'ingreso') {
        totalIncome += amt;
      } else {
        totalExpenses += amt;
      }
    });

    const balance = totalIncome - totalExpenses;

    res.json({
      period: { year: year || 'Todos', month: month || 'Todos' },
      totalIncome,
      totalExpenses,
      balance,
      count: filtered.length,
      items: filtered
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar el resumen.' });
  }
};

exports.exportToExcel = async (req, res) => {
  try {
    const expenses = await getExpensesDB();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Control Financiero');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Fecha', key: 'date', width: 15 },
      { header: 'Establecimiento / Concepto', key: 'vendor', width: 30 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Monto ($)', key: 'amount', width: 15 },
      { header: 'Moneda', key: 'currency', width: 10 }
    ];

    expenses.forEach(item => worksheet.addRow({
      ...item,
      type: item.type === 'ingreso' ? 'Ingreso' : 'Gasto'
    }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="control_financiero.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Error al generar el archivo Excel.' });
  }
};
// 6. Eliminar un registro
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    let currentExpenses = await getExpensesDB();

    const filteredExpenses = currentExpenses.filter(item => item.id !== id);

    if (currentExpenses.length === filteredExpenses.length) {
      return res.status(404).json({ error: 'Registro no encontrado.' });
    }

    await saveExpensesDB(filteredExpenses);
    res.json({ message: 'Registro eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el registro.' });
  }
};
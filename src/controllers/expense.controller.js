const fileOrganizerService = require('../services/fileOrganizer.service');
const ocrParserService = require('../services/ocrParser.service');
const fs = require('fs/promises');
const path = require('path');

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
      ...parsedData,
      filePath: finalPath,
      uploadedAt: new Date().toISOString()
    };

    const currentExpenses = await getExpensesDB();
    currentExpenses.push(record);
    await saveExpensesDB(currentExpenses);

    res.status(201).json({
      message: 'Comprobante procesado y organizado exitosamente.',
      data: record
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al procesar el archivo.', details: error.message });
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

    const total = filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    res.json({
      period: { year: year || 'Todos', month: month || 'Todos' },
      totalExpenses: total,
      count: filtered.length,
      items: filtered
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar resumen mensual.' });
  }
};
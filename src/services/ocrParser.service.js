const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

class OcrParserService {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async parseReceipt(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const rawText = pdfData.text;

      const prompt = `
      Analiza el siguiente texto extraído de un recibo o factura de compra:
      """
      ${rawText}
      """
      Responde EXCLUSIVAMENTE con un objeto JSON válido con este formato:
      {
        "vendor": "Nombre de la tienda/empresa",
        "amount": 0.00,
        "currency": "MXN",
        "date": "YYYY-MM-DD",
        "category": "Alimentos | Servicios | Transporte | Entretenimiento | Otros"
      }
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const cleanJson = response.text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Error al procesar comprobante:', error);
      return {
        vendor: 'Desconocido',
        amount: 0,
        currency: 'MXN',
        date: new Date().toISOString().split('T')[0],
        category: 'Otros'
      };
    }
  }
}

module.exports = new OcrParserService();
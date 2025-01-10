const fs = require('fs');

function isValidPDF(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfHeader = fileBuffer.slice(0, 4).toString();
    return pdfHeader === '%PDF';
}

module.exports = {
    isValidPDF
};

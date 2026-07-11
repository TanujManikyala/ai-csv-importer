"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCSVBuffer = parseCSVBuffer;
function parseCSVBuffer(buffer) {
    const text = buffer.toString('utf-8');
    const lines = [];
    let row = [];
    let currentToken = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentToken += '"';
                i++; // skip next quote
            }
            else {
                inQuotes = !inQuotes;
            }
        }
        else if (char === ',' && !inQuotes) {
            row.push(currentToken.trim());
            currentToken = '';
        }
        else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            row.push(currentToken.trim());
            currentToken = '';
            if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
                lines.push(row);
            }
            row = [];
        }
        else {
            currentToken += char;
        }
    }
    if (currentToken !== '' || row.length > 0) {
        row.push(currentToken.trim());
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
            lines.push(row);
        }
    }
    if (lines.length < 2)
        return [];
    const headers = lines[0].map(h => h.trim().replace(/^["']|["']$/g, ''));
    const records = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i];
        const record = {};
        headers.forEach((header, index) => {
            if (header) {
                let val = values[index] !== undefined ? values[index] : '';
                // Strip outer quotes if any
                val = val.replace(/^["']|["']$/g, '');
                record[header] = val;
            }
        });
        records.push(record);
    }
    return records;
}

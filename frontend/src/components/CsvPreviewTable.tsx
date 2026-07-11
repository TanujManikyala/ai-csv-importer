'use client';

import React from 'react';

interface CsvPreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
}

export default function CsvPreviewTable({ headers, rows }: CsvPreviewTableProps) {
  if (headers.length === 0 || rows.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">No preview available</p>
        <p className="empty-state-desc">Please upload a valid CSV file to preview the data.</p>
      </div>
    );
  }

  // Preview only first 100 rows for high-performance virtual-feel rendering
  const PREVIEW_LIMIT = 100;
  const previewRows = rows.slice(0, PREVIEW_LIMIT);
  const totalCount = rows.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <span>Showing first {previewRows.length} of {totalCount} rows</span>
        {totalCount > PREVIEW_LIMIT && <span>(Table truncated for performance)</span>}
      </div>

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)' }}>#</th>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                  {rowIndex + 1}
                </td>
                {headers.map((header, colIndex) => (
                  <td key={colIndex} title={row[header] || ''}>
                    {row[header] !== undefined ? row[header] : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

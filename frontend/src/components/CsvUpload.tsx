'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Download } from 'lucide-react';
import { downloadCSV, MESSY_CSV_CONTENT } from '../utils/sampleCsv';

interface CsvUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export default function CsvUpload({ onFileSelect, selectedFile, onClear }: CsvUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        onFileSelect(file);
      } else {
        alert('Please upload a valid CSV file.');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
      {selectedFile ? (
        <div className="selected-file-card">
          <div className="file-info-group">
            <div className="file-icon-box">
              <FileText size={22} />
            </div>
            <div className="selected-file-details">
              <span className="selected-file-name">{selectedFile.name}</span>
              <span className="selected-file-size">{formatFileSize(selectedFile.size)}</span>
            </div>
          </div>
          <button className="remove-file-btn" onClick={onClear} title="Remove File">
            <X size={18} />
          </button>
        </div>
      ) : (
        <div
          className={`dropzone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            style={{ display: 'none' }}
            accept=".csv"
            onChange={handleFileInput}
          />
          <div className="dropzone-icon-container">
            <Upload size={24} />
          </div>
          <div className="dropzone-title">Drop your CSV file here</div>
          <div className="dropzone-subtitle">or click to browse files</div>
          
          <div className="file-spec">
            Supported file: .csv (max 5MB)
          </div>
          
          <div className="csv-headers-notice">
            The AI automatically matches headers to standard CRM fields like created_at, name, email, mobile_without_country_code, lead_owner, status, etc.
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="download-template-link"
              onClick={(e) => {
                e.stopPropagation();
                downloadCSV('test_leads.csv', MESSY_CSV_CONTENT);
              }}
            >
              <Download size={14} />
              Download test_leads.csv Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

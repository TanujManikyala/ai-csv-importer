'use client';

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  LayoutDashboard,
  Zap,
  Users,
  Settings,
  ShieldCheck,
  Globe,
  Plus,
  X,
  FileSpreadsheet,
  AlertCircle,
  FolderTree,
  PhoneCall,
  UserCheck,
  Layers,
  ArrowRight
} from 'lucide-react';
import CsvUpload from '../components/CsvUpload';
import CsvPreviewTable from '../components/CsvPreviewTable';
import ResultTable from '../components/ResultTable';
import ProgressBar from '../components/ProgressBar';

interface CRMRecord {
  created_at?: string;
  name?: string;
  email?: string;
  country_code?: string;
  mobile_without_country_code?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string;
  crm_status?: 'GOOD_LEAD_FOLLOW_UP' | 'DID_NOT_CONNECT' | 'BAD_LEAD' | 'SALE_DONE';
  crm_note?: string;
  data_source?: string;
  possession_time?: string;
  description?: string;
}

interface SkippedRecord {
  record: Record<string, string>;
  reason: string;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'sources' | 'dashboard'>('sources');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1);

  // File parsing states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);

  // AI Import states
  const [importedLeads, setImportedLeads] = useState<CRMRecord[]>([]);
  const [skippedLeads, setSkippedLeads] = useState<SkippedRecord[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [progressStatus, setProgressStatus] = useState('');
  const [progressSubStatus, setProgressSubStatus] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    console.log('[GrowEasy Dashboard] Mounted client-side successfully.');
  }, []);

  // Open / Close Modal
  const openModal = () => {
    console.log('[GrowEasy Dashboard] openModal button clicked. Opening modal...', { isModalOpen: true });
    resetState();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetState();
  };

  const resetState = () => {
    setModalStep(1);
    setSelectedFile(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setImportedLeads([]);
    setSkippedLeads([]);
    setProgress({ current: 0, total: 0 });
    setProgressStatus('');
    setProgressSubStatus('');
    setApiError(null);
  };

  // PapaParse file handler
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setApiError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }
        
        const headers = results.meta.fields || [];
        const rows = results.data || [];

        if (rows.length === 0) {
          setApiError('The uploaded CSV file contains no valid rows.');
          setSelectedFile(null);
          return;
        }

        setParsedHeaders(headers);
        setParsedRows(rows);
        setModalStep(2); // Auto advance to preview
      },
      error: (error) => {
        setApiError(`Failed to parse CSV: ${error.message}`);
        setSelectedFile(null);
      }
    });
  };

  // Resilient batch import runner
  const executeBatchImport = async () => {
    setModalStep(3);
    setApiError(null);
    setImportedLeads([]);
    setSkippedLeads([]);

    const BATCH_SIZE = 25; // Optimized batch size for AI context & rate-limits
    const totalRows = parsedRows.length;
    let processed = 0;

    const accumulatedImported: CRMRecord[] = [];
    const accumulatedSkipped: SkippedRecord[] = [];
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = parsedRows.slice(i, i + BATCH_SIZE);
      setProgress({ current: processed, total: totalRows });
      setProgressStatus(`Processing lead batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(totalRows / BATCH_SIZE)}...`);
      setProgressSubStatus(`Mapping ${batch.length} rows using Google Gemini AI`);

      const maxRetries = 3;
      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        try {
          const response = await fetch(`${backendUrl}/api/import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ records: batch }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Server responded with ${response.status}`);
          }

          const data = await response.json();
          if (data.success) {
            accumulatedImported.push(...data.imported);
            accumulatedSkipped.push(...data.skipped);
            success = true;
          } else {
            throw new Error(data.message || 'API import returned success=false');
          }
        } catch (err: any) {
          attempt++;
          if (attempt >= maxRetries) {
            console.error(`Batch starting at index ${i} failed:`, err);
            // Append these items as skipped instead of failing the whole import
            batch.forEach((row) => {
              accumulatedSkipped.push({
                record: row,
                reason: `Failed after ${maxRetries} attempts due to error: ${err.message || 'Unknown error'}`
              });
            });
            success = true; // Set success to true to exit loop (we recorded it as skipped)
          } else {
            setProgressStatus(`Batch ${Math.floor(i / BATCH_SIZE) + 1} encountered rate limits / error.`);
            setProgressSubStatus(`Retrying attempt ${attempt + 1}/${maxRetries} in 1.5 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      }

      processed += batch.length;
    }

    setProgress({ current: totalRows, total: totalRows });
    setImportedLeads(accumulatedImported);
    setSkippedLeads(accumulatedSkipped);
    setModalStep(4); // Advance to results
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">G</div>
          <span className="logo-text">GrowEasy</span>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Main Menu</div>
          <ul className="nav-list">
            <li>
              <a 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </a>
            </li>
            <li>
              <a className="nav-item">
                <Zap size={18} />
                Generate Leads
              </a>
            </li>
            <li>
              <a className="nav-item">
                <Users size={18} />
                Manage Leads
              </a>
            </li>
          </ul>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Control Center</div>
          <ul className="nav-list">
            <li>
              <a className="nav-item">
                <UserCheck size={18} />
                Team Members
              </a>
            </li>
            <li>
              <a 
                className={`nav-item ${activeTab === 'sources' ? 'active' : ''}`}
                onClick={() => setActiveTab('sources')}
              >
                <Layers size={18} />
                Lead Sources
              </a>
            </li>
            <li>
              <a className="nav-item">
                <Globe size={18} />
                Ad Accounts
              </a>
            </li>
            <li>
              <a className="nav-item">
                <PhoneCall size={18} />
                Tele Calling
              </a>
            </li>
            <li>
              <a className="nav-item">
                <FolderTree size={18} />
                CRM Fields
              </a>
            </li>
          </ul>
        </div>

        <div className="user-profile">
          <div className="avatar">VK</div>
          <div className="user-info">
            <span className="user-name">VK Test</span>
            <span className="user-role">Owner</span>
          </div>
        </div>
      </aside>

      {/* Main content body */}
      <main className="main-content">
        <header className="header-container">
          <div className="page-title-group">
            <h1 className="page-title">Lead Sources</h1>
            <p className="page-subtitle">Connect, manage, and control all your lead channels from one dashboard.</p>
          </div>
          <button className="btn btn-primary" onClick={openModal}>
            <Plus size={16} />
            Import CSV File
          </button>
        </header>

        {activeTab === 'sources' ? (
          <div className="glass-panel" style={{ padding: '36px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '24px', fontWeight: 700 }}>Connect Active Lead Integrations</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {/* Google Ads Card */}
              <div style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#4285F4' }}>G</div>
                  <div>
                    <h3 style={{ fontSize: '15px' }}>Google Lead Ads</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inactive</span>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Automate pulling leads generated from Google Search, Display, and Video campaigns directly into your CRM.</p>
                <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%' }}>Connect Account</button>
              </div>

              {/* Facebook Ads Card */}
              <div style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#1877F2' }}>F</div>
                  <div>
                    <h3 style={{ fontSize: '15px' }}>Facebook Lead Export</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inactive</span>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sync your Facebook Instant Forms campaigns to instantly fetch prospective customer leads into GrowEasy.</p>
                <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%' }}>Connect Account</button>
              </div>

              {/* CSV Importer Card */}
              <div style={{ padding: '24px', border: '2px solid var(--accent-coral)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', boxShadow: 'var(--shadow-glow)' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '16px', backgroundColor: 'var(--accent-coral)', color: 'white', fontSize: '9px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>AI Enabled</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--accent-coral-glow)', color: 'var(--accent-coral)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px' }}>Custom CSV Importer</h3>
                    <span style={{ fontSize: '11px', color: 'var(--accent-coral)', fontWeight: '600' }}>Active</span>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Upload any CSV file layout (Facebook ads, agency exports, custom sheets) and map fields using AI.</p>
                <button className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }} onClick={openModal}>Import Leads via CSV</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel">
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Dashboard Overview</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Select "Lead Sources" in the sidebar or click "Import CSV File" in the header to run the AI importer.</p>
          </div>
        )}
      </main>

      {/* Import Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Import Leads via CSV</h2>
                <p className="modal-description">Upload a CSV file to bulk import leads into your system.</p>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Stepper progress */}
              <div className="stepper">
                <div className={`step-item ${modalStep >= 1 ? 'active' : ''} ${modalStep > 1 ? 'completed' : ''}`}>
                  <div className="step-badge">{modalStep > 1 ? '✓' : '1'}</div>
                  <span className="step-label">Upload File</span>
                </div>
                <div className={`step-item ${modalStep >= 2 ? 'active' : ''} ${modalStep > 2 ? 'completed' : ''}`}>
                  <div className="step-badge">{modalStep > 2 ? '✓' : '2'}</div>
                  <span className="step-label">Preview Data</span>
                </div>
                <div className={`step-item ${modalStep >= 3 ? 'active' : ''} ${modalStep > 3 ? 'completed' : ''}`}>
                  <div className="step-badge">{modalStep > 3 ? '✓' : '3'}</div>
                  <span className="step-label">AI Processing</span>
                </div>
                <div className={`step-item ${modalStep >= 4 ? 'active' : ''} ${modalStep > 4 ? 'completed' : ''}`}>
                  <div className="step-badge">4</div>
                  <span className="step-label">Final Mapped Results</span>
                </div>
              </div>

              {/* Error boundary */}
              {apiError && (
                <div className="error-banner">
                  <AlertCircle className="error-banner-icon" size={18} />
                  <div className="error-details">
                    <span className="error-title">Import Error</span>
                    <span>{apiError}</span>
                  </div>
                </div>
              )}

              {/* Wizard steps content */}
              {modalStep === 1 && (
                <CsvUpload
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  onClear={resetState}
                />
              )}

              {modalStep === 2 && (
                <CsvPreviewTable
                  headers={parsedHeaders}
                  rows={parsedRows}
                />
              )}

              {modalStep === 3 && (
                <ProgressBar
                  current={progress.current}
                  total={progress.total}
                  message={progressStatus}
                  subMessage={progressSubStatus}
                />
              )}

              {modalStep === 4 && (
                <ResultTable
                  imported={importedLeads}
                  skipped={skippedLeads}
                />
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={modalStep === 4 ? resetState : closeModal}
                disabled={modalStep === 3}
              >
                {modalStep === 4 ? 'Reset / Import New' : 'Cancel'}
              </button>

              {modalStep === 2 && (
                <button className="btn btn-primary" onClick={executeBatchImport}>
                  Confirm Import & Map with AI
                  <ArrowRight size={16} />
                </button>
              )}

              {modalStep === 4 && (
                <button className="btn btn-primary" style={{ backgroundColor: 'var(--accent-green)' }} onClick={closeModal}>
                  Close Wizard (Done)
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

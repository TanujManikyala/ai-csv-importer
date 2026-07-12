'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  LayoutDashboard,
  Zap,
  Users,
  Globe,
  Plus,
  X,
  FileSpreadsheet,
  AlertCircle,
  FolderTree,
  PhoneCall,
  UserCheck,
  Layers,
  ArrowRight,
  CheckCircle2,
  XCircle,
  BarChart3
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
  const [activeTab, setActiveTab] = useState<'sources' | 'dashboard' | 'generate' | 'manage' | 'team' | 'ads' | 'tele' | 'fields'>('sources');
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
        } catch (err: unknown) {
          attempt++;
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          if (attempt >= maxRetries) {
            console.error(`Batch starting at index ${i} failed:`, err);
            // Append these items as skipped instead of failing the whole import
            batch.forEach((row) => {
              accumulatedSkipped.push({
                record: row,
                reason: `Failed after ${maxRetries} attempts due to error: ${errorMessage}`
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

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Dashboard Overview',
          subtitle: 'Monitor your overall CRM lead acquisition and system performance.'
        };
      case 'generate':
        return {
          title: 'Generate Leads',
          subtitle: 'Configure automated generation settings and sync live ad campaigns.'
        };
      case 'manage':
        return {
          title: 'Manage Leads',
          subtitle: 'View, edit, search, and audit your imported CRM contacts.'
        };
      case 'team':
        return {
          title: 'Team Members',
          subtitle: 'Manage administrative roles, telecalling assignments, and access rights.'
        };
      case 'ads':
        return {
          title: 'Ad Accounts',
          subtitle: 'Connect and authorize Facebook and Google Ad accounts to sync leads.'
        };
      case 'tele':
        return {
          title: 'Tele Calling Settings',
          subtitle: 'Integrate virtual numbers, manage dialers, and review caller agent logs.'
        };
      case 'fields':
        return {
          title: 'CRM Fields Reference',
          subtitle: 'Standard CRM lead fields that our AI mapping engine validates and targets.'
        };
      case 'sources':
      default:
        return {
          title: 'Lead Sources',
          subtitle: 'Connect, manage, and control all your lead channels from one dashboard.'
        };
    }
  };

  const headerInfo = getHeaderInfo();

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
              <a 
                className={`nav-item ${activeTab === 'generate' ? 'active' : ''}`}
                onClick={() => setActiveTab('generate')}
              >
                <Zap size={18} />
                Generate Leads
              </a>
            </li>
            <li>
              <a 
                className={`nav-item ${activeTab === 'manage' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage')}
              >
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
              <a 
                className={`nav-item ${activeTab === 'team' ? 'active' : ''}`}
                onClick={() => setActiveTab('team')}
              >
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
              <a 
                className={`nav-item ${activeTab === 'ads' ? 'active' : ''}`}
                onClick={() => setActiveTab('ads')}
              >
                <Globe size={18} />
                Ad Accounts
              </a>
            </li>
            <li>
              <a 
                className={`nav-item ${activeTab === 'tele' ? 'active' : ''}`}
                onClick={() => setActiveTab('tele')}
              >
                <PhoneCall size={18} />
                Tele Calling
              </a>
            </li>
            <li>
              <a 
                className={`nav-item ${activeTab === 'fields' ? 'active' : ''}`}
                onClick={() => setActiveTab('fields')}
              >
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
            <h1 className="page-title">{headerInfo.title}</h1>
            <p className="page-subtitle">{headerInfo.subtitle}</p>
          </div>
          {(activeTab === 'sources' || activeTab === 'dashboard' || activeTab === 'manage') && (
            <button className="btn btn-primary" onClick={openModal}>
              <Plus size={16} />
              Import CSV File
            </button>
          )}
        </header>

        {activeTab === 'sources' && (
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
                <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%' }} onClick={() => setActiveTab('ads')}>Connect Account</button>
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
                <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%' }} onClick={() => setActiveTab('ads')}>Connect Account</button>
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
        )}

        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon-wrapper total">
                  <Users size={20} />
                </div>
                <div className="stat-data">
                  <span className="stat-value">{importedLeads.length + skippedLeads.length}</span>
                  <span className="stat-label">Total Handled</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper imported">
                  <CheckCircle2 size={20} style={{ color: 'var(--accent-green)' }} />
                </div>
                <div className="stat-data">
                  <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{importedLeads.length}</span>
                  <span className="stat-label">Imported CRM Leads</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper skipped">
                  <XCircle size={20} style={{ color: 'var(--accent-red)' }} />
                </div>
                <div className="stat-data">
                  <span className="stat-value" style={{ color: 'var(--accent-red)' }}>{skippedLeads.length}</span>
                  <span className="stat-label">Skipped (No Contact)</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper rate">
                  <BarChart3 size={20} />
                </div>
                <div className="stat-data">
                  <span className="stat-value" style={{ color: 'var(--accent-coral)' }}>
                    {importedLeads.length + skippedLeads.length > 0 
                      ? Math.round((importedLeads.length / (importedLeads.length + skippedLeads.length)) * 100) 
                      : 0}%
                  </span>
                  <span className="stat-label">Success Rate</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              <div className="glass-panel" style={{ margin: 0 }}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Quick CRM Summary</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Your lead channels are running. Use the CSV Importer to quickly ingest external databases.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-primary" onClick={openModal}>Import CSV Database</button>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('manage')}>View Leads List</button>
                </div>
              </div>

              <div className="glass-panel" style={{ margin: 0 }}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Connected Integration Status</h2>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span>Facebook Sync</span>
                    <span className="badge badge-grey">Disconnected</span>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span>Google Sync</span>
                    <span className="badge badge-grey">Disconnected</span>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>AI Mapping Engine</span>
                    <span className="badge badge-success">Online</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="glass-panel">
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Automated Campaign Syncing</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Sync and download Facebook or Google Instant Forms leads directly. Connect your accounts to pull incoming leads automatically every 5 minutes.
            </p>
            <div style={{ border: '1px solid var(--border-color)', padding: '24px', borderRadius: '8px', textAlign: 'center', backgroundColor: 'var(--bg-primary)' }}>
              <Zap size={32} style={{ color: 'var(--accent-coral)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>No Active Sync Connections</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', maxWidth: '400px', margin: '0 auto 16px' }}>
                Please connect your Facebook Business Manager or Google Ads Client account in the &quot;Ad Accounts&quot; tab to synchronize leads.
              </p>
              <button className="btn btn-primary" onClick={() => setActiveTab('ads')}>Go to Ad Accounts</button>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>CRM Leads Database</h2>
            {importedLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Users size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>No Leads in CRM</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Please import a CSV database file using the AI mapping wizard to see your leads here.
                </p>
                <button className="btn btn-primary" onClick={openModal}>Import CSV Database</button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'var(--bg-tertiary)' }}>Name</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Created At</th>
                      <th>Company</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedLeads.map((record, index) => {
                      const phoneDisplay = record.country_code
                        ? `${record.country_code} ${record.mobile_without_country_code}`
                        : record.mobile_without_country_code || '—';
                      
                      const locationDisplay = [record.city, record.state, record.country]
                        .filter(Boolean)
                        .join(', ') || '—';

                      return (
                        <tr key={index}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)', position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'var(--bg-primary)' }}>
                            {record.name || '—'}
                          </td>
                          <td>{phoneDisplay}</td>
                          <td>{record.email || '—'}</td>
                          <td>{record.created_at || '—'}</td>
                          <td>{record.company || '—'}</td>
                          <td>{locationDisplay}</td>
                          <td>
                            {record.crm_status === 'GOOD_LEAD_FOLLOW_UP' && <span className="badge badge-success">Good Lead</span>}
                            {record.crm_status === 'SALE_DONE' && <span className="badge badge-info">Sale Done</span>}
                            {record.crm_status === 'BAD_LEAD' && <span className="badge badge-danger">Bad Lead</span>}
                            {(record.crm_status === 'DID_NOT_CONNECT' || !record.crm_status) && <span className="badge badge-grey">Not Connected</span>}
                          </td>
                          <td>
                            {record.data_source ? <span className="badge badge-warning" style={{ fontSize: '10px' }}>{record.data_source}</span> : '—'}
                          </td>
                          <td title={record.crm_note || ''}>{record.crm_note || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px' }}>Active CRM Operators</h2>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                <Plus size={14} /> Add Member
              </button>
            </div>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Assigned Leads</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Varun</td>
                    <td>varun@groweasy.ai</td>
                    <td><span className="badge badge-info">Administrator</span></td>
                    <td><span className="badge badge-success">Active</span></td>
                    <td>All Leads</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>VK Test</td>
                    <td>owner@groweasy.ai</td>
                    <td><span className="badge badge-info">Owner</span></td>
                    <td><span className="badge badge-success">Active</span></td>
                    <td>All Leads</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Sarah Jenkins</td>
                    <td>sarah.j@groweasy.ai</td>
                    <td><span className="badge badge-grey">Telecaller Agent</span></td>
                    <td><span className="badge badge-success">Active</span></td>
                    <td>42 Leads</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Rajesh Kumar</td>
                    <td>rajesh.k@groweasy.ai</td>
                    <td><span className="badge badge-grey">Telecaller Agent</span></td>
                    <td><span className="badge badge-success">Active</span></td>
                    <td>15 Leads</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="glass-panel">
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Authorize Advertising Channels</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Authorize GrowEasy to automatically retrieve lead forms from your advertising accounts.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(24, 119, 242, 0.1)', color: '#1877F2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>F</div>
                  <div>
                    <h3 style={{ fontSize: '16px' }}>Facebook Business Ads</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status: Disconnected</span>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Connect page form webhooks to fetch leads instantly as they fill out your instant forms.</p>
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: 'auto' }}>Link Facebook Account</button>
              </div>

              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>G</div>
                  <div>
                    <h3 style={{ fontSize: '16px' }}>Google Lead Form Extension</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status: Disconnected</span>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Map Search and Display lead form asset webhook endpoints directly to GrowEasy CRM.</p>
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: 'auto' }}>Link Google Ads Account</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tele' && (
          <div className="glass-panel">
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Virtual Dialers & Calling Logs</h2>
            <div style={{ border: '1px solid var(--border-color)', padding: '20px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>Active Calling Line</h3>
                <p style={{ fontSize: '13px', color: 'var(--accent-coral)', fontWeight: 'bold' }}>+91 98765 00000</p>
              </div>
              <span className="badge badge-success">Online & Listening</span>
            </div>
            <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>Recent Dialer Logs</h3>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Call ID</th>
                    <th>Lead Name</th>
                    <th>Destination</th>
                    <th>Call Duration</th>
                    <th>Disposition</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CALL-9018</td>
                    <td style={{ fontWeight: 600 }}>John Doe</td>
                    <td>+91 98765 43210</td>
                    <td>2 mins 15 secs</td>
                    <td><span className="badge badge-success">GOOD_LEAD_FOLLOW_UP</span></td>
                  </tr>
                  <tr>
                    <td>CALL-9017</td>
                    <td style={{ fontWeight: 600 }}>Sarah Johnson</td>
                    <td>+91 98765 43211</td>
                    <td>0 mins 45 secs</td>
                    <td><span className="badge badge-grey">DID_NOT_CONNECT</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'fields' && (
          <div className="glass-panel">
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>GrowEasy Standard CRM Schema</h2>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Field Key</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Validation Rules</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>created_at</td>
                    <td>String (Date)</td>
                    <td>Lead creation submission date</td>
                    <td>Must parse with `new Date()`</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>name</td>
                    <td>String</td>
                    <td>Full name of the lead</td>
                    <td>Combined if split in CSV</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>email</td>
                    <td>String (Email)</td>
                    <td>Primary email address of lead</td>
                    <td>First email selected</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>mobile_without_country_code</td>
                    <td>String (Number)</td>
                    <td>Calling mobile number (excluding country code)</td>
                    <td>Digits only</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>crm_status</td>
                    <td>Enum</td>
                    <td>Lead status label</td>
                    <td>GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>data_source</td>
                    <td>Enum</td>
                    <td>Origin lead source channel</td>
                    <td>leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>crm_note</td>
                    <td>String</td>
                    <td>Consolidated notes, secondary emails, and extra phones</td>
                    <td>Parsed dynamically</td>
                  </tr>
                </tbody>
              </table>
            </div>
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

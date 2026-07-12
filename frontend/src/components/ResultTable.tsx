'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Users, BarChart3, Database, FileWarning } from 'lucide-react';

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

interface ResultTableProps {
  imported: CRMRecord[];
  skipped: SkippedRecord[];
}

export default function ResultTable({ imported, skipped }: ResultTableProps) {
  const [activeTab, setActiveTab] = useState<'imported' | 'skipped'>('imported');

  const totalProcessed = imported.length + skipped.length;
  const successRate = totalProcessed > 0 ? Math.round((imported.length / totalProcessed) * 100) : 0;

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'GOOD_LEAD_FOLLOW_UP':
        return <span className="badge badge-success">Good Lead</span>;
      case 'SALE_DONE':
        return <span className="badge badge-info">Sale Done</span>;
      case 'BAD_LEAD':
        return <span className="badge badge-danger">Bad Lead</span>;
      case 'DID_NOT_CONNECT':
      default:
        return <span className="badge badge-grey">Not Connected</span>;
    }
  };

  const renderSourceBadge = (source?: string) => {
    if (!source) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    return <span className="badge badge-warning" style={{ fontSize: '10px' }}>{source}</span>;
  };

  // Get headers for skipped records dynamically
  const skippedHeaders = skipped.length > 0 ? Object.keys(skipped[0].record) : [];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Stats Dashboard Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper total">
            <Users size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{totalProcessed}</span>
            <span className="stat-label">Total Processed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper imported">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{imported.length}</span>
            <span className="stat-label">Total Imported</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper skipped">
            <XCircle size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value" style={{ color: 'var(--accent-red)' }}>{skipped.length}</span>
            <span className="stat-label">Total Skipped</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper rate">
            <BarChart3 size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value" style={{ color: 'var(--accent-coral)' }}>{successRate}%</span>
            <span className="stat-label">Success Rate</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', gap: '8px' }}>
        <button
          className="btn"
          style={{
            background: 'transparent',
            color: activeTab === 'imported' ? 'var(--accent-coral)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'imported' ? '2px solid var(--accent-coral)' : 'none',
            borderRadius: 0,
            padding: '12px 16px',
            fontWeight: 600,
            boxShadow: 'none'
          }}
          onClick={() => setActiveTab('imported')}
        >
          <Database size={16} style={{ marginRight: '6px', display: 'inline' }} />
          Imported CRM Leads ({imported.length})
        </button>

        {skipped.length > 0 && (
          <button
            className="btn"
            style={{
              background: 'transparent',
              color: activeTab === 'skipped' ? 'var(--accent-coral)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'skipped' ? '2px solid var(--accent-coral)' : 'none',
              borderRadius: 0,
              padding: '12px 16px',
              fontWeight: 600,
              boxShadow: 'none'
            }}
            onClick={() => setActiveTab('skipped')}
          >
            <FileWarning size={16} style={{ marginRight: '6px', display: 'inline' }} />
            Skipped Records ({skipped.length})
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'imported' ? (
        imported.length === 0 ? (
          <div className="empty-state">
            <Users className="empty-state-icon" size={40} />
            <p className="empty-state-title">No leads imported</p>
            <p className="empty-state-desc">All records were skipped or mapping failed. Make sure your CSV contains email or phone columns.</p>
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
                  <th>City / Location</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {imported.map((record, index) => {
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
                      <td>{renderStatusBadge(record.crm_status)}</td>
                      <td>{renderSourceBadge(record.data_source)}</td>
                      <td title={record.crm_note || ''}>{record.crm_note || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-red)', fontWeight: 'bold' }}>Reason for Skip</th>
                {skippedHeaders.map((header, idx) => (
                  <th key={idx}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skipped.map((item, index) => (
                <tr key={index}>
                  <td style={{ color: 'var(--accent-red)', fontWeight: 'bold', backgroundColor: 'var(--accent-red-glow)' }} title={item.reason}>
                    {item.reason}
                  </td>
                  {skippedHeaders.map((header, idx) => (
                    <td key={idx} title={item.record[header] || ''}>
                      {item.record[header] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

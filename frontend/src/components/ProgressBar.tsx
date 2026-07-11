'use client';

import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  message?: string;
  subMessage?: string;
}

export default function ProgressBar({ current, total, message = 'Processing...', subMessage }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="progress-container" style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="progress-spinner"></div>
      
      <div className="progress-status-text">
        {message}
      </div>

      <div className="progress-bar-bg">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          {percentage}% Complete
        </span>
        {subMessage && (
          <span className="progress-substatus">
            {subMessage}
          </span>
        )}
      </div>
    </div>
  );
}

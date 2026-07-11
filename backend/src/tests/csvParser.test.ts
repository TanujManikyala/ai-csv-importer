import { describe, it, expect } from 'vitest';
import { parseCSVBuffer } from '../utils/csvParser.js';

describe('CSV Parser Utility', () => {
  it('should parse standard CSV buffer correctly', () => {
    const csvContent = `created_at,name,email,mobile_without_country_code
2026-05-13 14:20:48,John Doe,john.doe@example.com,9876543210
2026-05-13 14:25:30,Sarah Johnson,sarah.johnson@example.com,9876543211`;

    const buffer = Buffer.from(csvContent, 'utf-8');
    const records = parseCSVBuffer(buffer);

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({
      created_at: '2026-05-13 14:20:48',
      name: 'John Doe',
      email: 'john.doe@example.com',
      mobile_without_country_code: '9876543210'
    });
    expect(records[1]).toEqual({
      created_at: '2026-05-13 14:25:30',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      mobile_without_country_code: '9876543211'
    });
  });

  it('should handle messy CSV fields with quotes and commas', () => {
    const csvContent = `Name,Email,Notes
"Vance, Bob",bob@vance.com,"Wants a follow-up call, busy next week"
"Dwight Schrute",dwight@dundermifflin.com,"No, call back never"`;

    const buffer = Buffer.from(csvContent, 'utf-8');
    const records = parseCSVBuffer(buffer);

    expect(records).toHaveLength(2);
    expect(records[0]['Name']).toBe('Vance, Bob');
    expect(records[0]['Notes']).toBe('Wants a follow-up call, busy next week');
    expect(records[1]['Name']).toBe('Dwight Schrute');
    expect(records[1]['Notes']).toBe('No, call back never');
  });

  it('should strip leading and trailing quotes from values', () => {
    const csvContent = `name,email
"John Doe","john@doe.com"`;

    const buffer = Buffer.from(csvContent, 'utf-8');
    const records = parseCSVBuffer(buffer);

    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('John Doe');
    expect(records[0].email).toBe('john@doe.com');
  });

  it('should return empty array for empty buffer', () => {
    const buffer = Buffer.from('', 'utf-8');
    const records = parseCSVBuffer(buffer);
    expect(records).toEqual([]);
  });
});

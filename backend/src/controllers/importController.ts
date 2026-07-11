import { Request, Response } from 'express';
import { mapBatchToCRM } from '../services/aiService.js';
import { GrowEasyCRMRecord, RawRecord, ImportResponse } from '../types/crm.js';
import { parseCSVBuffer } from '../utils/csvParser.js';

// Allowed values for validations
const ALLOWED_STATUSES = new Set(['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE']);
const ALLOWED_SOURCES = new Set(['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots']);

function processAndValidateBatch(
  rawRecords: RawRecord[],
  mappedRecords: Partial<GrowEasyCRMRecord>[]
) {
  const imported: Partial<GrowEasyCRMRecord>[] = [];
  const skipped: { record: RawRecord; reason: string }[] = [];

  for (let i = 0; i < rawRecords.length; i++) {
    const raw = rawRecords[i];
    // Gemini could potentially return fewer items than the batch if it errors, though rare with structured outputs
    const mapped = mappedRecords[i];

    if (!mapped) {
      skipped.push({
        record: raw,
        reason: 'AI mapping failed to generate record'
      });
      continue;
    }

    // Clean strings and check email / mobile
    const email = (mapped.email || '').trim();
    const mobile = (mapped.mobile_without_country_code || '').trim();

    // Rule 7: Skip invalid records (neither email nor mobile number)
    if (!email && !mobile) {
      skipped.push({
        record: raw,
        reason: 'Record skipped: missing both email and mobile number'
      });
      continue;
    }

    // Normalize date
    let createdAt = (mapped.created_at || '').trim();
    if (createdAt) {
      const dateVal = new Date(createdAt);
      if (isNaN(dateVal.getTime())) {
        // Fallback if AI output date is invalid
        createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      } else {
        createdAt = dateVal.toISOString().replace('T', ' ').substring(0, 19);
      }
    } else {
      // Default to current time
      createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    // Validate and sanitize status (must be one of the enum values)
    let status = (mapped.crm_status || 'DID_NOT_CONNECT') as GrowEasyCRMRecord['crm_status'];
    if (!ALLOWED_STATUSES.has(status)) {
      status = 'DID_NOT_CONNECT';
    }

    // Validate and sanitize data source
    let source = (mapped.data_source || '') as GrowEasyCRMRecord['data_source'];
    if (source && !ALLOWED_SOURCES.has(source)) {
      source = '';
    }

    // Build the clean record
    const validatedRecord: Partial<GrowEasyCRMRecord> = {
      created_at: createdAt,
      name: (mapped.name || '').trim(),
      email: email,
      country_code: (mapped.country_code || '').trim(),
      mobile_without_country_code: mobile,
      company: (mapped.company || '').trim(),
      city: (mapped.city || '').trim(),
      state: (mapped.state || '').trim(),
      country: (mapped.country || '').trim(),
      lead_owner: (mapped.lead_owner || '').trim(),
      crm_status: status,
      crm_note: (mapped.crm_note || '').trim(),
      data_source: source,
      possession_time: (mapped.possession_time || '').trim(),
      description: (mapped.description || '').trim()
    };

    imported.push(validatedRecord);
  }

  return { imported, skipped };
}

export async function importBatchHandler(req: Request, res: Response) {
  try {
    const { records } = req.body as { records: RawRecord[] };

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid records array'
      });
    }

    // Run AI mapping on this batch
    const mapped = await mapBatchToCRM(records);

    // Process and validate
    const { imported, skipped } = processAndValidateBatch(records, mapped);

    const responsePayload: ImportResponse = {
      success: true,
      imported,
      skipped,
      stats: {
        totalProcessed: records.length,
        totalImported: imported.length,
        totalSkipped: skipped.length
      }
    };

    return res.json(responsePayload);
  } catch (error: any) {
    console.error('Error in importBatchHandler:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
}

export async function importFileHandler(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const rawRecords = parseCSVBuffer(req.file.buffer);

    if (rawRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or invalid'
      });
    }

    // Batch process raw records on the backend (e.g. batches of 30)
    const BATCH_SIZE = 30;
    const allImported: Partial<GrowEasyCRMRecord>[] = [];
    const allSkipped: { record: RawRecord; reason: string }[] = [];

    for (let i = 0; i < rawRecords.length; i += BATCH_SIZE) {
      const batch = rawRecords.slice(i, i + BATCH_SIZE);
      console.log(`Processing backend file upload batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(rawRecords.length / BATCH_SIZE)}`);
      
      try {
        const mapped = await mapBatchToCRM(batch);
        const { imported, skipped } = processAndValidateBatch(batch, mapped);
        allImported.push(...imported);
        allSkipped.push(...skipped);
      } catch (batchError: any) {
        console.error(`Error processing batch starting at index ${i}:`, batchError);
        // Mark all items in this batch as skipped due to failure
        batch.forEach(record => {
          allSkipped.push({
            record,
            reason: `AI mapping error: ${batchError.message || 'Unknown error'}`
          });
        });
      }
    }

    const responsePayload: ImportResponse = {
      success: true,
      imported: allImported,
      skipped: allSkipped,
      stats: {
        totalProcessed: rawRecords.length,
        totalImported: allImported.length,
        totalSkipped: allSkipped.length
      }
    };

    return res.json(responsePayload);
  } catch (error: any) {
    console.error('Error in importFileHandler:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
}

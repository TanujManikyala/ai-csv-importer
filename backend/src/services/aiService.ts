import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GrowEasyCRMRecord, RawRecord } from '../types/crm.js';

// Define structured JSON Schema for Google Gemini
const geminiCrmSchema = {
  type: SchemaType.ARRAY,
  description: 'List of mapped GrowEasy CRM records',
  items: {
    type: SchemaType.OBJECT,
    properties: {
      created_at: {
        type: SchemaType.STRING,
        description: 'Lead creation date/time. Format to YYYY-MM-DD HH:mm:ss so new Date(created_at) parses in JS.'
      },
      name: {
        type: SchemaType.STRING,
        description: 'Full name of the lead.'
      },
      email: {
        type: SchemaType.STRING,
        description: 'Primary email address. If multiple are found, use the first one.'
      },
      country_code: {
        type: SchemaType.STRING,
        description: 'Country calling code (e.g. +91, +1).'
      },
      mobile_without_country_code: {
        type: SchemaType.STRING,
        description: 'Mobile phone number without the country code.'
      },
      company: {
        type: SchemaType.STRING,
        description: 'Company name.'
      },
      city: {
        type: SchemaType.STRING,
        description: 'City.'
      },
      state: {
        type: SchemaType.STRING,
        description: 'State.'
      },
      country: {
        type: SchemaType.STRING,
        description: 'Country.'
      },
      lead_owner: {
        type: SchemaType.STRING,
        description: 'Owner of the lead (usually an email or name).'
      },
      crm_status: {
        type: SchemaType.STRING,
        description: 'Status of the lead. Must be one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE.',
      },
      crm_note: {
        type: SchemaType.STRING,
        description: 'Remarks, comments, notes, extra email addresses, extra phone numbers, or details that do not fit in any other field.'
      },
      data_source: {
        type: SchemaType.STRING,
        description: 'Source. Must be one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots, or empty string "".'
      },
      possession_time: {
        type: SchemaType.STRING,
        description: 'Time or date when property possession is desired.'
      },
      description: {
        type: SchemaType.STRING,
        description: 'Description or details about the client request.'
      }
    },
    required: []
  }
};

const promptInstructions = `
You are a highly capable data parsing system for GrowEasy CRM.
Your task is to take a batch of raw records with dynamically named headers, analyze the contents, and map them to the GrowEasy CRM schema.

### Mapping Rules:
1. **Name**: Extract the lead's full name. If split into "First Name" and "Last Name", combine them.
2. **Email**: If multiple emails exist, use the first email for the "email" field. Append any additional emails into the "crm_note" field.
3. **Mobile & Country Code**: Extract the primary phone number. Separate the country calling code (e.g. +91, +1) into "country_code" and the rest into "mobile_without_country_code". Strip any spaces, dashes, or formatting if possible. If multiple phone numbers exist, use the first, and append extra phone numbers into "crm_note".
4. **CRM Status**: Maps the lead status to one of these EXACT values:
   - GOOD_LEAD_FOLLOW_UP (e.g., interested, callback, follow-up, warm lead)
   - DID_NOT_CONNECT (e.g., no answer, switched off, busy, wrong number, or default if unspecified)
   - BAD_LEAD (e.g., not interested, fake number, student, irrelevant, out of budget)
   - SALE_DONE (e.g., deal closed, booked, payment received)
5. **Data Source**: Map to one of these EXACT values, or leave as an empty string "" if none fit:
   - leads_on_demand
   - meridian_tower
   - eden_park
   - varah_swamy
   - sarjapur_plots
6. **Date Parsing**: Look for columns representing creation dates or submission times. Format the date value to an ISO 8601 date string or format (e.g. "YYYY-MM-DD HH:mm:ss") so that new Date(created_at) parses correctly in Javascript.
7. **CRM Note**: Consolidate unmapped details, extra email addresses, extra phone numbers, remarks, or specific notes. Avoid using newlines; instead, use spaces or "\\n" as a separator.
8. **Stateless Compliance**: Do not omit records due to empty fields here. Perform mapping for all provided records. The program logic will handle skipping records without contact info later.
`;

async function mapWithGemini(records: RawRecord[], apiKey: string): Promise<Partial<GrowEasyCRMRecord>[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: geminiCrmSchema,
    }
  });

  const prompt = `
${promptInstructions}

Here are the raw records to parse:
${JSON.stringify(records, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  if (!responseText) {
    throw new Error('Gemini API returned an empty response');
  }
  
  return JSON.parse(responseText) as Partial<GrowEasyCRMRecord>[];
}

async function mapWithOpenAI(records: RawRecord[], apiKey: string): Promise<Partial<GrowEasyCRMRecord>[]> {
  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  
  const openAiSchema = {
    name: "crm_mapping",
    strict: true,
    schema: {
      type: "object",
      properties: {
        records: {
          type: "array",
          items: {
            type: "object",
            properties: {
              created_at: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              country_code: { type: "string" },
              mobile_without_country_code: { type: "string" },
              company: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              country: { type: "string" },
              lead_owner: { type: "string" },
              crm_status: { type: "string", enum: ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"] },
              crm_note: { type: "string" },
              data_source: { type: "string", enum: ["leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots", ""] },
              possession_time: { type: "string" },
              description: { type: "string" }
            },
            required: [
              "created_at", "name", "email", "country_code", "mobile_without_country_code",
              "company", "city", "state", "country", "lead_owner", "crm_status", "crm_note",
              "data_source", "possession_time", "description"
            ],
            additionalProperties: false
          }
        }
      },
      required: ["records"],
      additionalProperties: false
    }
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: promptInstructions
        },
        {
          role: 'user',
          content: `Map these records: ${JSON.stringify(records)}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: openAiSchema
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API failed: ${response.status} ${response.statusText} - ${errText}`);
  }

  const resJson = await response.json() as any;
  const content = resJson.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI API returned an empty message content');
  }

  const parsed = JSON.parse(content) as { records: Partial<GrowEasyCRMRecord>[] };
  return parsed.records;
}

export async function mapBatchToCRM(records: RawRecord[]): Promise<Partial<GrowEasyCRMRecord>[]> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    console.log('[AI Service] Mapping batch using Google Gemini API...');
    return await mapWithGemini(records, geminiKey);
  } else if (openaiKey && !openaiKey.startsWith('sk_vwe78916')) { // Ensure it's not the dummy key from system env
    console.log('[AI Service] Mapping batch using OpenAI API...');
    return await mapWithOpenAI(records, openaiKey);
  } else {
    // If only the dummy key exists, we can still attempt OpenAI or fail gracefully.
    if (openaiKey) {
      console.log('[AI Service] Found openAI key in environment, attempting mapping...');
      try {
        return await mapWithOpenAI(records, openaiKey);
      } catch (e: any) {
        console.error('[AI Service] OpenAI attempt failed, maybe it is a mock key. Error:', e.message);
      }
    }
    
    throw new Error('No valid AI API Key found. Please define GEMINI_API_KEY or a valid OPENAI_API_KEY in your backend .env file.');
  }
}

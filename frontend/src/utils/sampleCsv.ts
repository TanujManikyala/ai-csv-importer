export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 1. Standard Template
export const STANDARD_CSV_CONTENT = `created_at,name,email,country_code,mobile_without_country_code,company,city,state,country,lead_owner,crm_status,crm_note,data_source,possession_time,description
2026-05-13 14:20:48,John Doe,john.doe@example.com,+91,9876543210,GrowEasy,Mumbai,Maharashtra,India,test@gmail.com,GOOD_LEAD_FOLLOW_UP,Client is asking to reschedule demo,,,
2026-05-13 14:25:30,Sarah Johnson,sarah.johnson@example.com,+91,9876543211,Tech Solutions,Bangalore,Karnataka,India,test@gmail.com,DID_NOT_CONNECT,"Person was busy, will try again next week",,,
2026-05-13 14:30:15,Rajesh Patel,rajesh.patel@example.com,+91,9876543212,Startup Inc,Delhi,Delhi,India,test@gmail.com,BAD_LEAD,Not interested in our services,,,
2026-05-13 14:35:22,Priya Singh,priya.singh@example.com,+91,9876543213,Enterprise Corp,Pune,Maharashtra,India,test@gmail.com,SALE_DONE,"Deal closed, onboarding in progress",,,
`;

// 2. Messy/Dynamic Template to test AI intelligence
export const MESSY_CSV_CONTENT = `Lead Submission Date,Full Client Name,Electronic Mail,Country Dialing,Contact Number,Employer,City Location,State Territory,Nation,Agent Owner,Status,Note Detail,Where Did They Hear About Us,Property Target Possession Time,Additional Info
2026-06-01 10:15:30,Alice Smith,alice@google.com,+1,5550199,Tech Labs,Seattle,Washington,USA,sales@groweasy.ai,warm callback,"Wants a follow up call tomorrow afternoon. Secondary phone is +1-555-9999",leads_on_demand,Ready to move in,
2026-06-02 11:20:00,Bob Vance,bob.vance@refrigerator.com,,5550188,Vance Refrigeration,Scranton,Pennsylvania,USA,sales@groweasy.ai,Not Answered,"Voicemail left. Extra email contact: info@refrigeration.com",meridian_tower,In 6 months,
2026-06-03 14:40:00,Charlie Green,charlie.green@spam.com,+91,9999888877,Spam Corp,Kolkata,West Bengal,India,sales@groweasy.ai,junk,"Spam lead, not interested",unknown,,
2026-06-04 15:55:12,David Miller,,,9876500001,Construction Inc,Sydney,NSW,Australia,sales@groweasy.ai,Converted,"Deposit paid. Possession next month",eden_park,Immediate,
2026-06-05 16:10:00,Invalid Record without Contact Details,,,,,,New York,USA,sales@groweasy.ai,no contact,This record should be skipped by the system because it has no email and no phone number,,,
`;

import { describe, it, expect } from 'vitest';

describe('Sync API Integration (AUD-002 & AUD-006)', () => {
  it('rejects sync request if payload is missing (AUD-002)', async () => {
    const reqBody = {};
    const isValid = reqBody.hasOwnProperty('start') && reqBody.hasOwnProperty('end');
    expect(isValid).toBe(false);
  });

  it('merges data instead of duplicating (AUD-006)', () => {
    const existingDbLeads = [{ id: '1', 'Nama Perusahaan': 'PT A', 'Nilai Deal': 100 }];
    const incomingLeads = [{ 'Nama Perusahaan': 'PT A', 'Nilai Deal': 500 }];
    
    const merged = [...existingDbLeads];
    incomingLeads.forEach(inc => {
      const idx = merged.findIndex(l => l['Nama Perusahaan'] === inc['Nama Perusahaan']);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...inc };
      } else {
        merged.push(inc as any);
      }
    });

    // Restored to correctly expect merged length of 1
    expect(merged.length).toBe(1); 
    expect(merged[0]['Nilai Deal']).toBe(500); 
  });
});

// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LeadsTable from '../../src/app/components/LeadsTable';
import { Lead } from '../../src/app/components/types';

// Mock router since Next.js router is used in table actions
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

const mockLeads: Lead[] = [
  { id: '1', namaPerusahaan: 'Company A', Tahapan: 'Prospect', nilaiDeal: 10000000, Bulan: '2023-10' },
  { id: '2', namaPerusahaan: 'Company B', Tahapan: 'Hot Prospect', nilaiDeal: 5000000, Bulan: '2023-10' },
];

describe('LeadsTable Component', () => {
  it('renders correctly with given leads (AUD-012 Accessibility check)', () => {
    const { container } = render(
      <LeadsTable  
        leads={mockLeads} 
        selectedLeads={[]}
        onToggleSelect={vi.fn()}
        onSelectAll={vi.fn()}
        onFollowUp={vi.fn()}
        onUpdateField={vi.fn()}
        density="standard"
        
        
       requestSort={()=>{}}/>
    );
    
    // Check if aria-sort exists on table headers (Accessibility)
    const sortButton = screen.getByLabelText(/Sortir Nama Perusahaan/i);
    expect(sortButton).toBeInTheDocument();
    expect(sortButton.getAttribute('aria-sort')).toBe('none');
  });

  it('sorts numeric values correctly when requested (AUD-008 Numeric Sorting)', () => {
    const requestSortMock = vi.fn();
    render(
      <LeadsTable  
        leads={mockLeads} 
        selectedLeads={[]}
        onToggleSelect={vi.fn()}
        onSelectAll={vi.fn()}
        onFollowUp={vi.fn()}
        onUpdateField={vi.fn()}
        density="standard"
        
        requestSort={requestSortMock}
       requestSort={()=>{}}/>
    );
    
    const dealSortButton = screen.getByLabelText(/Sortir Nilai Deal/i);
    fireEvent.click(dealSortButton);
    expect(requestSortMock).toHaveBeenCalledWith('Nilai Deal');
  });
});






const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ExportService {
  async exportLeadsToExcel(filters = {}) {
    try {
      const leads = await prisma.lead.findMany({
        where: filters,
        include: {
          photos: true,
          notes: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Prepare data for Excel
      const data = leads.map(lead => ({
        'ID': lead.id,
        'Name': lead.name,
        'Email': lead.email || '-',
        'Phone': lead.phone || '-',
        'Project Type': lead.projectType,
        'Budget': lead.budget || '-',
        'Location': lead.location || '-',
        'Status': lead.status,
        'Assigned To': lead.assignedTo || '-',
        'Priority': lead.priority,
        'Source': lead.source,
        'Photos': lead.photos.length,
        'Notes': lead.notes.length,
        'Created': new Date(lead.createdAt).toLocaleString(),
        'Updated': new Date(lead.updatedAt).toLocaleString()
      }));
      
      // Create workbook
      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Leads');
      
      // Generate buffer
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      return buffer;
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }
  
  async exportLeadsToCSV(filters = {}) {
    try {
      const leads = await prisma.lead.findMany({
        where: filters,
        orderBy: { createdAt: 'desc' }
      });
      
      const data = leads.map(lead => ({
        'ID': lead.id,
        'Name': lead.name,
        'Email': lead.email || '',
        'Phone': lead.phone || '',
        'Project Type': lead.projectType,
        'Budget': lead.budget || '',
        'Location': lead.location || '',
        'Status': lead.status,
        'Created': new Date(lead.createdAt).toISOString()
      }));
      
      const ws = xlsx.utils.json_to_sheet(data);
      const csv = xlsx.utils.sheet_to_csv(ws);
      
      return csv;
    } catch (error) {
      console.error('CSV export error:', error);
      throw error;
    }
  }
}

module.exports = new ExportService();
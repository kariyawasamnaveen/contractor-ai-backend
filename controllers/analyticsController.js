const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AnalyticsController {
  // Dashboard stats
  async getDashboardStats(req, res) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const [
        totalLeads,
        todayLeads,
        weekLeads,
        monthLeads,
        statusBreakdown,
        sourceBreakdown
      ] = await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({ where: { createdAt: { gte: today } } }),
        prisma.lead.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.lead.count({ where: { createdAt: { gte: monthAgo } } }),
        prisma.lead.groupBy({
          by: ['status'],
          _count: true
        }),
        prisma.lead.groupBy({
          by: ['source'],
          _count: true
        })
      ]);
      
      res.json({
        success: true,
        stats: {
          total: totalLeads,
          today: todayLeads,
          week: weekLeads,
          month: monthLeads,
          byStatus: statusBreakdown,
          bySource: sourceBreakdown
        }
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }

  // Leads over time (for charts)
  async getLeadsOverTime(req, res) {
    try {
      const { days = 30 } = req.query;
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const leads = await prisma.lead.findMany({
        where: { createdAt: { gte: daysAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' }
      });
      
      // Group by date
      const groupedByDate = leads.reduce((acc, lead) => {
        const date = lead.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, count: 0, new: 0, contacted: 0, qualified: 0 };
        }
        acc[date].count++;
        if (lead.status === 'new') acc[date].new++;
        if (lead.status === 'contacted') acc[date].contacted++;
        if (lead.status === 'qualified') acc[date].qualified++;
        return acc;
      }, {});
      
      const chartData = Object.values(groupedByDate);
      
      res.json({ success: true, data: chartData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get chart data' });
    }
  }

  // Revenue analytics
  async getRevenueStats(req, res) {
    try {
      const leads = await prisma.lead.findMany({
        where: {
          budget: { not: null }
        },
        select: { budget: true, status: true }
      });
      
      const extractNumber = (budget) => {
        const match = budget.match(/[\d,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : 0;
      };
      
      const totalValue = leads.reduce((sum, lead) => sum + extractNumber(lead.budget), 0);
      const avgDealSize = leads.length > 0 ? totalValue / leads.length : 0;
      
      const wonLeads = leads.filter(l => l.status === 'won');
      const wonValue = wonLeads.reduce((sum, lead) => sum + extractNumber(lead.budget), 0);
      
      res.json({
        success: true,
        revenue: {
          totalPipeline: totalValue,
          averageDeal: Math.round(avgDealSize),
          wonDeals: wonValue,
          leadsWithBudget: leads.length,
          conversionRate: leads.length > 0 ? ((wonLeads.length / leads.length) * 100).toFixed(1) : 0
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get revenue stats' });
    }
  }
}

module.exports = new AnalyticsController();
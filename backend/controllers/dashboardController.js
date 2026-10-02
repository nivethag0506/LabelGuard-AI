import Scan from '../models/Scan.js';
import { isDatabaseConnected } from '../config/db.js';

export const getDashboardStats = async (req, res) => {
  try {
    let scans = [];

    if (isDatabaseConnected()) {
      scans = await Scan.find().sort({ createdAt: -1 }).lean();
    }

    const totalScans = scans.length;
    let compliantCount = 0;
    let needsReviewCount = 0;
    let highRiskCount = 0;
    let totalScore = 0;

    const issueFrequency = {};

    let fourViewCount = 0;
    let incompleteCount = 0;
    const categoryDistribution = {};
    const unclearFieldFrequency = {};

    scans.forEach(scan => {
      const score = Number(scan.complianceScore) || 0;
      totalScore += score;

      if (scan.status === 'COMPLIANT' || score >= 90) {
        compliantCount++;
      } else if (scan.status === 'NEEDS_REVIEW' || (score >= 70 && score < 90)) {
        needsReviewCount++;
      } else {
        highRiskCount++;
      }

      // Track inspection completeness
      const comp = scan.inspectionCompleteness || {};
      if (comp.overallCompleteness === 'COMPLETE' || comp.viewsCount === 4) {
        fourViewCount++;
      } else {
        incompleteCount++;
      }

      // Track product categories
      const cat = scan.productCategory || 'General Packaged Commodity';
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;

      // Track rule evaluations for unclear declarations
      if (Array.isArray(scan.ruleEvaluations)) {
        scan.ruleEvaluations.forEach(r => {
          if (r.status === 'NEEDS_REVIEW') {
            const fieldName = r.label || r.field;
            unclearFieldFrequency[fieldName] = (unclearFieldFrequency[fieldName] || 0) + 1;
          }
        });
      }

      if (Array.isArray(scan.issues)) {
        scan.issues.forEach(issue => {
          const key = issue.title || issue.field || 'General Non-Compliance';
          if (!issueFrequency[key]) {
            issueFrequency[key] = {
              title: key,
              field: issue.field || 'Unknown',
              severity: issue.severity || 'MEDIUM',
              count: 0
            };
          }
          issueFrequency[key].count++;
        });
      }
    });

    const averageScore = totalScans > 0 ? Math.round(totalScore / totalScans) : 0;
    const fourViewPercentage = totalScans > 0 ? Math.round((fourViewCount / totalScans) * 100) : 0;
    const incompletePercentage = totalScans > 0 ? Math.max(0, 100 - fourViewPercentage) : 0;

    // Sort common issues by count descending
    const commonIssues = Object.values(issueFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Frequently unclear declarations
    const frequentlyUnclearDeclarations = Object.entries(unclearFieldFrequency)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent 5 scans from actual records
    const recentScans = scans.slice(0, 5).map(s => ({
      _id: s._id,
      productName: s.productName,
      manufacturer: s.manufacturer,
      complianceScore: s.complianceScore,
      status: s.status,
      issuesCount: (s.issues || []).length,
      createdAt: s.createdAt
    }));

    // Compliance trend computed dynamically from actual inspection records
    const trendMap = {};
    scans.forEach(scan => {
      const dateKey = scan.createdAt ? new Date(scan.createdAt).toISOString().split('T')[0] : 'Today';
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { totalScore: 0, count: 0 };
      }
      trendMap[dateKey].totalScore += (Number(scan.complianceScore) || 0);
      trendMap[dateKey].count++;
    });

    const complianceTrend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([day, val]) => ({
        day,
        count: val.count,
        avgScore: Math.round(val.totalScore / val.count)
      }));

    return res.json({
      success: true,
      data: {
        totalScans,
        compliantCount,
        needsReviewCount,
        highRiskCount,
        averageScore,
        complianceDistribution: {
          compliant: compliantCount,
          needsReview: needsReviewCount,
          highRisk: highRiskCount
        },
        inspectionCompletenessStats: {
          fourViewCount,
          incompleteCount,
          fourViewPercentage: `${fourViewPercentage}%`,
          incompletePercentage: `${incompletePercentage}%`
        },
        categoryDistribution,
        frequentlyUnclearDeclarations,
        commonIssues,
        recentScans,
        complianceTrend,
        dataSource: isDatabaseConnected() ? 'MongoDB' : 'Local Storage'
      }
    });
  } catch (error) {
    console.error('[getDashboardStats Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate dashboard analytics: ' + error.message
    });
  }
};

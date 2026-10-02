import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ComplianceRule from '../models/ComplianceRule.js';
import Scan from '../models/Scan.js';
import User from '../models/User.js';
import { DEFAULT_RULES } from '../services/complianceEngine.js';

dotenv.config();

export const SEED_USERS = [
  {
    name: 'Inspector Rajesh Kumar',
    email: 'rajesh.kumar@legalmetrology.gov.in',
    role: 'INSPECTOR',
  },
  {
    name: 'Admin Meera Swaminathan',
    email: 'meera.s@legalmetrology.gov.in',
    role: 'ADMIN',
  }
];

export const SEED_SCANS = [
  {
    productName: 'Premium Rice',
    manufacturer: 'ABC Foods Private Limited',
    manufacturerAddress: 'SF No. 42/1, Industrial Estate, Coimbatore, Tamil Nadu - 641021',
    packer: 'ABC Foods Packaging Division',
    importer: 'N/A',
    netQuantity: '5 kg',
    mrp: '₹425 (Inclusive of all taxes)',
    batchNumber: 'B12345',
    manufacturingDate: '01/09/2026',
    bestBefore: '6 Months from packaging date',
    expiryDate: '01/03/2027',
    countryOfOrigin: 'India',
    consumerCare: '1800-123-4567 | support@abcfoods.in',
    productImageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    complianceScore: 100,
    status: 'COMPLIANT',
    passedRules: 10,
    warningRules: 0,
    failedRules: 0,
    totalRules: 10,
    issues: [],
    createdAt: new Date(Date.now() - 3600 * 1000 * 4) // 4 hours ago
  },
  {
    productName: 'Organic Whole Wheat Atta',
    manufacturer: 'Nature Harvest Agro Mills',
    manufacturerAddress: 'Plot 18, Phase 2, GIDC Estate, Ahmedabad, Gujarat - 382445',
    packer: 'Nature Harvest Agro Mills',
    importer: 'N/A',
    netQuantity: '10 kg',
    mrp: '₹490.00 (Incl. of all taxes)',
    batchNumber: 'NHA-9082',
    manufacturingDate: '15/09/2026',
    bestBefore: '90 Days from packaging',
    expiryDate: '15/12/2026',
    countryOfOrigin: 'India',
    consumerCare: 'customercare@natureharvest.com | 1800-444-9988',
    productImageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    complianceScore: 100,
    status: 'COMPLIANT',
    passedRules: 10,
    warningRules: 0,
    failedRules: 0,
    totalRules: 10,
    issues: [],
    createdAt: new Date(Date.now() - 3600 * 1000 * 14)
  },
  {
    productName: 'Pure Desi Ghee 1L',
    manufacturer: 'Vedic Dairy Producer Co.',
    manufacturerAddress: 'Village Kankroli, Dist. Anand, Gujarat - 388001',
    packer: 'Vedic Dairy Producer Co.',
    importer: 'N/A',
    netQuantity: '1 L (910 g)',
    mrp: '₹680 (Incl. of all taxes)',
    batchNumber: 'VD-GH-412',
    manufacturingDate: '10/09/2026',
    bestBefore: '9 Months from MFD',
    expiryDate: '10/06/2027',
    countryOfOrigin: 'India',
    consumerCare: '1800-233-1122 | feedback@vedicdairy.in',
    productImageUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80',
    complianceScore: 100,
    status: 'COMPLIANT',
    passedRules: 10,
    warningRules: 0,
    failedRules: 0,
    totalRules: 10,
    issues: [],
    createdAt: new Date(Date.now() - 3600 * 1000 * 28)
  },
  {
    productName: 'Crispy Potato Wafers',
    manufacturer: 'SnackTime Confectionery Ltd',
    manufacturerAddress: 'Industrial Zone, Thane, Maharashtra',
    packer: 'SnackTime Confectionery Ltd',
    importer: 'N/A',
    netQuantity: '115 g',
    mrp: '₹35.00',
    batchNumber: 'ST-8812',
    manufacturingDate: '22/09/2026',
    bestBefore: '4 Months',
    expiryDate: '22/01/2027',
    countryOfOrigin: 'India',
    consumerCare: 'care@snacktime.in | 022-28901234',
    productImageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80',
    complianceScore: 88,
    status: 'NEEDS_REVIEW',
    passedRules: 8,
    warningRules: 2,
    failedRules: 0,
    totalRules: 10,
    issues: [
      {
        ruleId: 'LMR-03',
        field: 'manufacturerAddress',
        title: 'Complete Address of Manufacturer Needs Verification',
        severity: 'MEDIUM',
        detectedValue: 'Industrial Zone, Thane, Maharashtra',
        explanation: 'Address does not include specific plot/building number or 6-digit postal PIN code.',
        recommendation: 'Ensure full premise address and PIN code are declared on front or back panel.'
      },
      {
        ruleId: 'LMR-05',
        field: 'mrp',
        title: 'MRP Format Needs Verification',
        severity: 'MEDIUM',
        detectedValue: '₹35.00',
        explanation: 'MRP is printed without the explicit suffix "(inclusive of all taxes)".',
        recommendation: 'Verify packaging contains standard statutory wording "incl. of all taxes".'
      }
    ],
    createdAt: new Date(Date.now() - 3600 * 1000 * 42)
  },
  {
    productName: 'Sun-Dried Red Chilli Powder',
    manufacturer: 'Spicex Agro Products',
    manufacturerAddress: 'Guntur, Andhra Pradesh',
    packer: 'Spicex Agro Products',
    importer: 'N/A',
    netQuantity: '500 g',
    mrp: '₹140',
    batchNumber: 'SPX-301',
    manufacturingDate: '05/08/2026',
    bestBefore: 'Not Detected',
    expiryDate: 'Not Detected',
    countryOfOrigin: 'India',
    consumerCare: 'care@spicexagro.com',
    productImageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
    complianceScore: 82,
    status: 'NEEDS_REVIEW',
    passedRules: 7,
    warningRules: 2,
    failedRules: 1,
    totalRules: 10,
    issues: [
      {
        ruleId: 'LMR-03',
        field: 'manufacturerAddress',
        title: 'Address Needs Verification',
        severity: 'MEDIUM',
        detectedValue: 'Guntur, Andhra Pradesh',
        explanation: 'Premises address lacks specific street location and postal PIN code.',
        recommendation: 'Inspect unit packaging to verify complete address format.'
      },
      {
        ruleId: 'LMR-08',
        field: 'bestBefore',
        title: 'Missing Best Before / Expiry Period',
        severity: 'MEDIUM',
        detectedValue: 'Not Detected',
        explanation: 'Best before duration was not detectable on the scanned panel.',
        recommendation: 'Check side or top gusset for printed expiration or best-before period.'
      }
    ],
    createdAt: new Date(Date.now() - 3600 * 1000 * 60)
  },
  {
    productName: 'Packaged Fruit Juice 200ml',
    manufacturer: 'Tropical Sips Bottling Co.',
    manufacturerAddress: 'Kochi SEZ, Kakkanad, Ernakulam, Kerala - 682037',
    packer: 'Tropical Sips Bottling Co.',
    importer: 'N/A',
    netQuantity: '200 ml',
    mrp: '₹30 (Incl. of all taxes)',
    batchNumber: 'TS-JU-99',
    manufacturingDate: 'Not Detected',
    bestBefore: '6 Months',
    expiryDate: 'Not Detected',
    countryOfOrigin: 'India',
    consumerCare: '1800-111-2233 | care@tropicalsips.com',
    productImageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=800&q=80',
    complianceScore: 85,
    status: 'NEEDS_REVIEW',
    passedRules: 8,
    warningRules: 0,
    failedRules: 2,
    totalRules: 10,
    issues: [
      {
        ruleId: 'LMR-07',
        field: 'manufacturingDate',
        title: 'Missing Date of Manufacture',
        severity: 'HIGH',
        detectedValue: 'Not Detected',
        explanation: 'Mandatory date of packaging or manufacture could not be extracted from the label.',
        recommendation: 'Ensure neck of bottle or seal crimp has clearly embossed MFD date stamp.'
      }
    ],
    createdAt: new Date(Date.now() - 3600 * 1000 * 75)
  },
  {
    productName: 'Premium Snack',
    manufacturer: 'XYZ Foods',
    manufacturerAddress: 'Tamil Nadu',
    packer: 'Not Detected',
    importer: 'Not Detected',
    netQuantity: '200 g',
    mrp: '₹80',
    batchNumber: 'SNK098',
    manufacturingDate: 'Not Detected',
    bestBefore: 'Not Detected',
    expiryDate: 'Not Detected',
    countryOfOrigin: 'Not Detected',
    consumerCare: 'Not Detected',
    productImageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80',
    complianceScore: 58,
    status: 'HIGH_RISK',
    passedRules: 4,
    warningRules: 2,
    failedRules: 4,
    totalRules: 10,
    issues: [
      {
        ruleId: 'LMR-03',
        field: 'manufacturerAddress',
        title: 'Complete Address of Manufacturer Needs Verification',
        severity: 'MEDIUM',
        detectedValue: 'Tamil Nadu',
        explanation: 'Address only mentions state without street, factory location, or PIN code.',
        recommendation: 'Declare full registered premises address.'
      },
      {
        ruleId: 'LMR-07',
        field: 'manufacturingDate',
        title: 'Missing Date of Manufacture / Packing',
        severity: 'HIGH',
        detectedValue: 'Not Detected',
        explanation: 'Month and year of manufacture or packing is absent.',
        recommendation: 'Stamp prominent MFD / PKD date.'
      },
      {
        ruleId: 'LMR-09',
        field: 'countryOfOrigin',
        title: 'Missing Country of Origin Declaration',
        severity: 'HIGH',
        detectedValue: 'Not Detected',
        explanation: 'Mandatory country of origin declaration was not found.',
        recommendation: 'Print country of origin prominently.'
      },
      {
        ruleId: 'LMR-10',
        field: 'consumerCare',
        title: 'Missing Consumer Care Details',
        severity: 'HIGH',
        detectedValue: 'Not Detected',
        explanation: 'No consumer redressal phone number, email, or contact point was detected.',
        recommendation: 'Mandatory grievance officer/care telephone and email must be displayed.'
      }
    ],
    createdAt: new Date(Date.now() - 3600 * 1000 * 90)
  },
  {
    productName: 'Imported Chocolate Wafer Bar',
    manufacturer: 'SweetDelight GmbH',
    manufacturerAddress: 'Bavaria, Germany',
    packer: 'Not Detected',
    importer: 'Not Detected',
    netQuantity: '1.75 oz',
    mrp: '150',
    batchNumber: 'GER-4412',
    manufacturingDate: 'Not Detected',
    bestBefore: '12/2026',
    expiryDate: '12/2026',
    countryOfOrigin: 'Not Detected',
    consumerCare: 'Not Detected',
    productImageUrl: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80',
    complianceScore: 45,
    status: 'HIGH_RISK',
    passedRules: 3,
    warningRules: 2,
    failedRules: 5,
    totalRules: 10,
    issues: [
      {
        ruleId: 'LMR-02',
        field: 'manufacturer',
        title: 'Missing Registered Importer Details',
        severity: 'HIGH',
        detectedValue: 'Not Detected',
        explanation: 'For imported goods, the Indian importer name and full address must be declared on an authorized over-label.',
        recommendation: 'Affix compliant supplementary sticker with Indian importer details.'
      },
      {
        ruleId: 'LMR-04',
        field: 'netQuantity',
        title: 'Non-Standard Net Quantity Unit',
        severity: 'HIGH',
        detectedValue: '1.75 oz',
        explanation: 'Unit declared in imperial ounce (oz) instead of mandatory metric units (g or kg).',
        recommendation: 'Declare net quantity in metric units (grams).'
      },
      {
        ruleId: 'LMR-09',
        field: 'countryOfOrigin',
        title: 'Missing Country of Origin',
        severity: 'HIGH',
        detectedValue: 'Not Detected',
        explanation: 'Country of origin is not explicitly declared in English/Hindi on packaging.',
        recommendation: 'Declare Country of Origin: Germany.'
      },
      {
        ruleId: 'LMR-10',
        field: 'consumerCare',
        title: 'Missing Consumer Care Details',
        severity: 'HIGH',
        detectedValue: 'Not Detected',
        explanation: 'No Indian consumer care phone or contact address provided.',
        recommendation: 'Provide Indian consumer care telephone and postal address.'
      }
    ],
    createdAt: new Date(Date.now() - 3600 * 1000 * 110)
  }
];

export const seedDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/legalscan';
  console.log(`[Seed] Connecting to MongoDB at ${uri}...`);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Seed] Connected to database: ${conn.connection.name}`);

    // Seed Compliance Rules
    console.log('[Seed] Seeding Compliance Rules...');
    await ComplianceRule.deleteMany({});
    await ComplianceRule.insertMany(DEFAULT_RULES);
    console.log(`[Seed] Successfully seeded ${DEFAULT_RULES.length} compliance rules.`);

    // Seed Users
    console.log('[Seed] Seeding Demo Users...');
    await User.deleteMany({});
    await User.insertMany(SEED_USERS);
    // Clear previous scan records to ensure real data only
    await Scan.deleteMany({});
    console.log('[Seed] Cleared scan collection. Ready for real user inspections.');

    console.log('[Seed] Database initialization completed successfully.');
    await mongoose.connection.close();
    return true;
  } catch (err) {
    console.warn('[Seed Warning] MongoDB connection failed during seed script:', err.message);
    console.warn('[Seed Notice] When MongoDB Atlas is configured in backend/.env, rerun: npm run seed');
    return false;
  }
};

// If run directly from command line
if (process.argv[1] && process.argv[1].endsWith('seedDatabase.js')) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}

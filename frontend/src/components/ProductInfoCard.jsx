import React from 'react';
import { Package, MapPin, Tag, Calendar, Globe, Phone, FileText } from 'lucide-react';
import './ProductInfoCard.css';

export default function ProductInfoCard({ scan }) {
  if (!scan) return null;

  const isDetected = (val) => {
    return val && val !== 'Not Detected' && val !== 'N/A' && val.trim().length > 0;
  };

  const fields = [
    { label: 'Product Name', value: scan.productName, icon: Package },
    { label: 'Manufacturer / Packer', value: scan.manufacturer || scan.packer, icon: Package },
    { label: 'Premises Address', value: scan.manufacturerAddress, icon: MapPin },
    { label: 'Net Quantity', value: scan.netQuantity, icon: Tag },
    { label: 'Maximum Retail Price (MRP)', value: scan.mrp, icon: Tag },
    { label: 'Batch / Lot Number', value: scan.batchNumber, icon: FileText },
    { label: 'Date of Manufacture / Packing', value: scan.manufacturingDate, icon: Calendar },
    { label: 'Best Before / Expiry', value: scan.bestBefore || scan.expiryDate, icon: Calendar },
    { label: 'Country of Origin', value: scan.countryOfOrigin, icon: Globe },
    { label: 'Consumer Care Helpline', value: scan.consumerCare, icon: Phone },
  ];

  return (
    <div className="card product-info-card">
      <div className="product-info-header">
        <h3 className="product-info-title">Detected Label Declarations</h3>
        <span className="product-info-badge">Structured Extraction</span>
      </div>

      <div className="product-info-grid">
        {fields.map((f, i) => {
          const detected = isDetected(f.value);
          const Icon = f.icon;
          return (
            <div key={i} className={`info-field-box ${detected ? 'detected' : 'missing'}`}>
              <div className="info-field-label-row">
                <Icon size={14} className="info-icon" />
                <span className="info-field-label">{f.label}</span>
                <span className={`detection-tag ${detected ? 'yes' : 'no'}`}>
                  {detected ? 'Detected' : 'Not Detected'}
                </span>
              </div>
              <div className="info-field-val">
                {detected ? f.value : 'Not detected on submitted panel'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, ScanLine, FileSearch, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import './AnalysisLoader.css';

const STAGES = [
  { id: 1, title: 'Reading product image', icon: ScanLine },
  { id: 2, title: 'Extracting label information', icon: FileSearch },
  { id: 3, title: 'Checking declarations', icon: FileSpreadsheet },
  { id: 4, title: 'Running compliance rules', icon: ShieldCheck },
  { id: 5, title: 'Generating report', icon: CheckCircle2 }
];

export default function AnalysisLoader() {
  const [currentStage, setCurrentStage] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < STAGES.length) return prev + 1;
        return prev;
      });
    }, 450); // Snappy, natural multi-stage progression

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="analysis-loader-container">
      <div className="analysis-loader-card">
        <div className="analysis-spinner-wrap">
          <Loader2 size={40} className="analysis-spinner animate-spin" />
        </div>

        <h3 className="analysis-title">Analyzing Packaged Commodity</h3>
        <p className="analysis-subtitle">
          Applying Legal Metrology (Packaged Commodities) Rules, 2011 Engine
        </p>

        <div className="analysis-stages-list">
          {STAGES.map((stage) => {
            const isCompleted = currentStage > stage.id;
            const isCurrent = currentStage === stage.id;
            const Icon = stage.icon;

            return (
              <div
                key={stage.id}
                className={`analysis-stage-item ${
                  isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'
                }`}
              >
                <div className="stage-icon-wrap">
                  {isCompleted ? (
                    <CheckCircle2 size={18} className="stage-done-icon" />
                  ) : isCurrent ? (
                    <Loader2 size={18} className="stage-current-icon animate-spin" />
                  ) : (
                    <Icon size={18} className="stage-pending-icon" />
                  )}
                </div>
                <span className="stage-text">{stage.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

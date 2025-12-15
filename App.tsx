import React, { useState } from 'react';
import { AppStage, Dataset } from './types';
import UploadStage from './components/UploadStage';
import ProfileStage from './components/ProfileStage';
import ObjectiveStage from './components/ObjectiveStage';
import DashboardStage from './components/DashboardStage';
import { Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.UPLOAD);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [objective, setObjective] = useState<string>("");

  const handleDatasetLoaded = (data: Dataset) => {
    setDataset(data);
    setStage(AppStage.PROFILE);
  };

  const handleProfileComplete = () => {
    setStage(AppStage.OBJECTIVE);
  };

  const handleObjectiveSet = (obj: string) => {
    setObjective(obj);
    setStage(AppStage.DASHBOARD);
  };

  const handleDatasetUpdate = (cleanedData: Dataset) => {
    setDataset(cleanedData);
  };

  const reset = () => {
    setDataset(null);
    setObjective("");
    setStage(AppStage.UPLOAD);
  };

  const canNavigateTo = (targetStage: AppStage) => {
    if (targetStage === AppStage.UPLOAD) return true;
    if (targetStage === AppStage.PROFILE) return !!dataset;
    if (targetStage === AppStage.OBJECTIVE) return !!dataset; // Can go to objective if data is loaded
    if (targetStage === AppStage.DASHBOARD) return !!dataset && !!objective;
    return false;
  };

  const NavItem = ({ target, label, number }: { target: AppStage, label: string, number: string }) => {
    const isActive = stage === target;
    const isEnabled = canNavigateTo(target);
    const isCompleted = (target === AppStage.UPLOAD && !!dataset) ||
                        (target === AppStage.PROFILE && stage !== AppStage.PROFILE && stage !== AppStage.UPLOAD) ||
                        (target === AppStage.OBJECTIVE && !!objective && stage === AppStage.DASHBOARD);

    return (
      <button 
        onClick={() => isEnabled && setStage(target)}
        disabled={!isEnabled}
        className={`flex items-center gap-2 transition-colors print:hidden ${
          isActive ? 'text-indigo-600 font-semibold' : 
          isEnabled ? 'text-slate-600 hover:text-indigo-500' : 'text-slate-300 cursor-not-allowed'
        }`}
      >
        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-colors ${
          isActive ? 'border-indigo-600 bg-indigo-50' : 
          isCompleted ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
          'border-current'
        }`}>
          {isCompleted ? '✓' : number}
        </span>
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={reset}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Sparkles size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">Auto<span className="text-indigo-600">Analyst</span></span>
          </div>

          <div className="flex items-center gap-4 md:gap-8 text-sm font-medium">
             <NavItem target={AppStage.UPLOAD} label="Upload" number="1" />
             <div className="w-4 md:w-8 h-[1px] bg-slate-200"></div>
             
             <NavItem target={AppStage.PROFILE} label="Profile" number="2" />
             <div className="w-4 md:w-8 h-[1px] bg-slate-200"></div>
             
             <NavItem target={AppStage.OBJECTIVE} label="Goal" number="3" />
             <div className="w-4 md:w-8 h-[1px] bg-slate-200"></div>
             
             <NavItem target={AppStage.DASHBOARD} label="Dashboard" number="4" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-6 print:p-0 print:m-0">
        <div className="max-w-7xl mx-auto h-full print:w-full print:max-w-none">
          {stage === AppStage.UPLOAD && <UploadStage onDatasetLoaded={handleDatasetLoaded} />}
          
          {stage === AppStage.PROFILE && dataset && (
            <ProfileStage dataset={dataset} onProceed={handleProfileComplete} />
          )}
          
          {stage === AppStage.OBJECTIVE && dataset && (
            <ObjectiveStage 
              dataset={dataset} 
              onObjectiveSet={handleObjectiveSet} 
              onDatasetUpdate={handleDatasetUpdate}
            />
          )}
          
          {stage === AppStage.DASHBOARD && dataset && (
            <DashboardStage dataset={dataset} objective={objective} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
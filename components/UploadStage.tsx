import React, { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { parseCSV, profileDataset } from '../utils';
import { Dataset } from '../types';

interface Props {
  onDatasetLoaded: (dataset: Dataset) => void;
}

const UploadStage: React.FC<Props> = ({ onDatasetLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      // Assume CSV for this demo, usually we'd check mimetype
      const rawData = parseCSV(text);
      if (rawData.length === 0) {
        throw new Error("No data found in file");
      }
      const dataset = profileDataset(rawData, file.name);
      onDatasetLoaded(dataset);
    } catch (err) {
      setError("Failed to process file. Please ensure it is a valid CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome to AutoAnalyst</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Upload your raw data (CSV) and let Gemini discover insights, build dashboards, and define analytical objectives automatically.
        </p>
      </div>

      <div
        className={`
          w-full max-w-xl p-12 border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col items-center
          ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-300 hover:border-indigo-400 bg-white'}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
          {loading ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div> : <Upload size={32} />}
        </div>
        
        <h3 className="text-xl font-semibold text-slate-700 mb-2">
          {loading ? 'Processing Data...' : 'Drag & drop your CSV file'}
        </h3>
        
        {!loading && (
          <>
            <p className="text-slate-400 mb-6 text-sm">or click to browse from your computer</p>
            <label className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg cursor-pointer transition-colors shadow-lg shadow-indigo-200">
              Browse Files
              <input type="file" className="hidden" accept=".csv" onChange={handleChange} />
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center max-w-4xl w-full">
         {[
           { icon: FileText, title: "Smart Ingestion", desc: "Instantly profiles columns and detects types" },
           { icon: Upload, title: "Objective Driven", desc: "Tell AI what you want to know" },
           { icon: FileText, title: "Instant Dashboards", desc: "Auto-generated visualizations" }
         ].map((item, i) => (
           <div key={i} className="p-4 rounded-xl bg-white shadow-sm border border-slate-100">
              <item.icon className="w-6 h-6 text-indigo-500 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-700">{item.title}</h4>
              <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
           </div>
         ))}
      </div>
    </div>
  );
};

export default UploadStage;
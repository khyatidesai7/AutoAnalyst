import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dataset } from '../types';
import { analyzeDataProfile } from '../services/geminiService';
import { ArrowRight, BarChart2, CheckCircle, AlertTriangle, Database } from 'lucide-react';

interface Props {
  dataset: Dataset;
  onProceed: () => void;
}

const ProfileStage: React.FC<Props> = ({ dataset, onProceed }) => {
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const runAnalysis = async () => {
      const result = await analyzeDataProfile(dataset);
      if (mounted) {
        setAnalysis(result);
        setLoading(false);
      }
    };
    runAnalysis();
    return () => { mounted = false; };
  }, [dataset]);

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Dataset Profile</h2>
           <p className="text-slate-500">Overview of <span className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">{dataset.name}</span></p>
        </div>
        <button 
          onClick={onProceed}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md shadow-indigo-200"
        >
          Define Objectives <ArrowRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Stats */}
        <div className="lg:col-span-2 space-y-6">
           {/* Quick Stats Grid */}
           <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-3 mb-2 text-slate-400">
                   <Database size={18} />
                   <span className="text-xs font-semibold uppercase tracking-wider">Total Rows</span>
                 </div>
                 <div className="text-3xl font-bold text-slate-800">{dataset.rowCount.toLocaleString()}</div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-3 mb-2 text-slate-400">
                   <BarChart2 size={18} />
                   <span className="text-xs font-semibold uppercase tracking-wider">Columns</span>
                 </div>
                 <div className="text-3xl font-bold text-slate-800">{dataset.columns.length}</div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-3 mb-2 text-slate-400">
                   <AlertTriangle size={18} />
                   <span className="text-xs font-semibold uppercase tracking-wider">Issues</span>
                 </div>
                 <div className="text-3xl font-bold text-slate-800">
                    {dataset.profile.filter(p => p.missingCount > 0).length}
                 </div>
              </div>
           </div>

           {/* Column Table */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
               <h3 className="font-semibold text-slate-700">Column Details</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500">
                   <tr>
                     <th className="px-6 py-3 font-medium">Name</th>
                     <th className="px-6 py-3 font-medium">Type</th>
                     <th className="px-6 py-3 font-medium">Missing</th>
                     <th className="px-6 py-3 font-medium">Samples</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {dataset.profile.map((col) => (
                     <tr key={col.name} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-3 font-medium text-slate-700">{col.name}</td>
                       <td className="px-6 py-3">
                         <span className={`px-2 py-1 rounded text-xs font-medium 
                           ${col.type === 'Number' ? 'bg-blue-50 text-blue-600' : 
                             col.type === 'Date' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                           {col.type}
                         </span>
                       </td>
                       <td className="px-6 py-3">
                         {col.missingPercentage > 0 ? (
                           <span className="text-amber-600 flex items-center gap-1">
                             <AlertTriangle size={12} /> {col.missingPercentage.toFixed(1)}%
                           </span>
                         ) : (
                           <span className="text-slate-400 flex items-center gap-1">
                             <CheckCircle size={12} /> 0%
                           </span>
                         )}
                       </td>
                       <td className="px-6 py-3 text-slate-500 font-mono text-xs truncate max-w-[200px]">
                         {col.sampleValues.join(', ')}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>

        {/* Right Col: AI Analysis */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-1 shadow-lg text-white h-full">
            <div className="bg-white/10 backdrop-blur-sm h-full rounded-xl p-6 flex flex-col">
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 ✨ Gemini Analysis
               </h3>
               
               <div className="flex-grow space-y-4 text-sm leading-relaxed text-indigo-50 overflow-y-auto">
                 {loading ? (
                   <div className="space-y-3 animate-pulse">
                     <div className="h-4 bg-white/20 rounded w-3/4"></div>
                     <div className="h-4 bg-white/20 rounded w-full"></div>
                     <div className="h-4 bg-white/20 rounded w-5/6"></div>
                   </div>
                 ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-sm prose-invert max-w-none prose-p:text-indigo-50 prose-headings:text-white prose-strong:text-white prose-li:text-indigo-50"
                      components={{
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />
                      }}
                    >
                     {analysis}
                    </ReactMarkdown>
                 )}
               </div>

               <div className="mt-6 pt-6 border-t border-white/10">
                 <p className="text-xs text-indigo-200 mb-2">Suggested Next Steps:</p>
                 <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-white/10 rounded text-xs">Explore Trends</span>
                    <span className="px-2 py-1 bg-white/10 rounded text-xs">Check Anomalies</span>
                    <span className="px-2 py-1 bg-white/10 rounded text-xs">Segment Data</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileStage;
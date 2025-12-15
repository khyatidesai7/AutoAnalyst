import React, { useEffect, useState } from 'react';
import { Dataset, ChartConfig, Insight } from '../types';
import { generateDashboardPlan } from '../services/geminiService';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { Download, Share2, LayoutDashboard, Lightbulb, FileText, FileSpreadsheet } from 'lucide-react';

interface Props {
  dataset: Dataset;
  objective: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];

const DashboardStage: React.FC<Props> = ({ dataset, objective }) => {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const build = async () => {
      setLoading(true);
      const plan = await generateDashboardPlan(dataset, objective);
      if (mounted) {
        setCharts(plan.charts);
        setInsights(plan.insights);
        setLoading(false);
      }
    };
    build();
    return () => { mounted = false; };
  }, [dataset, objective]);

  const downloadData = () => {
    if (!dataset.rows.length) return;
    
    // Create CSV content
    const headers = dataset.columns.join(',');
    const rows = dataset.rows.map(row => 
      dataset.columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        // Handle strings with commas, quotes, or newlines by wrapping in quotes and escaping internal quotes
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create and trigger download link
    const link = document.createElement('a');
    if (link.download !== undefined) { 
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${dataset.name.replace(/\.[^/.]+$/, "")}_cleansed.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const downloadPBIX = () => {
    // Generate a mock PBIX file (JSON structure representing the dashboard)
    // In a real app, this would be a binary file from a backend.
    const dashboardConfig = {
      title: "AutoAnalyst Dashboard",
      objective: objective,
      metadata: {
        datasetName: dataset.name,
        rowCount: dataset.rowCount,
        columns: dataset.columns,
        generatedAt: new Date().toISOString()
      },
      visualizations: charts,
      insights: insights
    };
    
    const blob = new Blob([JSON.stringify(dashboardConfig, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      // Using .pbix extension as requested, though file content is JSON text
      link.setAttribute('download', `${dataset.name.replace(/\.[^/.]+$/, "")}_dashboard.pbix`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    // window.print() opens the system print dialog, which allows "Save as PDF"
    window.print();
  };

  const renderChart = (config: ChartConfig) => {
    const chartData = dataset.rows.length > 200 
      ? dataset.rows.filter((_, i) => i % Math.ceil(dataset.rows.length / 200) === 0)
      : dataset.rows;

    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    switch (config.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={config.xKey} stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              {config.dataKeys.map((k, i) => (
                <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <defs>
                 {config.dataKeys.map((k, i) => (
                   <linearGradient key={`grad-${k}`} id={`color-${k}`} x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3}/>
                     <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                   </linearGradient>
                 ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={config.xKey} stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Legend />
              {config.dataKeys.map((k, i) => (
                <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} fillOpacity={1} fill={`url(#color-${k})`} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        const aggData = React.useMemo(() => {
           const counts: Record<string, number> = {};
           dataset.rows.forEach(r => {
             const key = String(r[config.xKey]);
             const val = Number(r[config.dataKeys[0]]) || 1; 
             counts[key] = (counts[key] || 0) + val;
           });
           return Object.entries(counts)
             .map(([name, value]) => ({ name, value }))
             .sort((a,b) => b.value - a.value)
             .slice(0, 8); 
        }, [dataset, config]);

        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={aggData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {aggData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
         return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey={config.xKey} name={config.xKey} />
              <YAxis type="number" dataKey={config.dataKeys[0]} name={config.dataKeys[0]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name={config.title} data={chartData} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
         )
      default: 
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={config.xKey} stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip cursor={{fill: '#f1f5f9'}} />
              <Legend />
              {config.dataKeys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <h3 className="text-xl font-semibold text-slate-700">Generating Dashboard</h3>
        <p className="text-slate-500 max-w-sm mt-2">Gemini is analyzing {dataset.rowCount.toLocaleString()} rows to build visualizations for "{objective}"...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8 print:space-y-6 print:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600" />
            Executive Dashboard
          </h2>
          <p className="text-slate-500">Auto-generated based on: "{objective}"</p>
        </div>
      </div>

      {/* Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((insight, i) => (
          <div key={i} className={`p-6 rounded-xl border border-l-4 shadow-sm bg-white
            ${insight.type === 'warning' ? 'border-l-amber-500' : 
              insight.type === 'success' ? 'border-l-emerald-500' : 'border-l-blue-500'}`}>
            <div className="flex items-center gap-2 mb-2">
               <Lightbulb size={18} className={
                 insight.type === 'warning' ? 'text-amber-500' : 
                 insight.type === 'success' ? 'text-emerald-500' : 'text-blue-500'
               } />
               <h4 className="font-semibold text-slate-800">{insight.title}</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{insight.content}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {charts.map((config) => (
          <div key={config.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm break-inside-avoid">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800">{config.title}</h3>
              <p className="text-sm text-slate-400">{config.description}</p>
            </div>
            <div className="w-full">
               {renderChart(config)}
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="mt-12 p-8 bg-slate-800 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl print:hidden">
         <div>
           <h3 className="text-xl font-bold mb-1">Ready to export?</h3>
           <p className="text-slate-400 text-sm">Download your cleansed data or take this dashboard to Power BI.</p>
         </div>
         <div className="flex flex-wrap gap-4">
            <button 
              type="button"
              onClick={downloadData}
              className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-medium border border-white/10"
            >
              <FileSpreadsheet size={18} className="text-emerald-400" />
              Download Data
            </button>
            <button 
              type="button"
              onClick={downloadPBIX}
              className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-medium border border-white/10"
            >
              <FileText size={18} className="text-yellow-400" />
              Download .pbix
            </button>
            <button 
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors font-medium shadow-lg shadow-indigo-900/50"
            >
              <Download size={18} />
              Export PDF
            </button>
         </div>
      </div>
    </div>
  );
};

export default DashboardStage;
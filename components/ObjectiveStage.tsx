import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { Dataset, ChatMessage, ChartConfig } from '../types';
import { chatWithData } from '../services/geminiService';
import { autoCleanDataset } from '../utils';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface Props {
  dataset: Dataset;
  onObjectiveSet: (objective: string) => void;
  onDatasetUpdate: (dataset: Dataset) => void;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];

const ObjectiveStage: React.FC<Props> = ({ dataset, onObjectiveSet, onDatasetUpdate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Auto Clean & Summarize", 
    "Manual Review", 
    "Skip to Analysis"
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize chat with cleaning options
  useEffect(() => {
    if (messages.length === 0) {
        setMessages([
            { 
                role: 'model', 
                text: `I've analyzed the **${dataset.rowCount} rows** in "${dataset.name}".\n\nBefore we define the analysis goal, **would you like to clean the data?**\n\nI can automatically impute missing values for you, or we can go through them manually one by one.`, 
                timestamp: Date.now() 
            }
        ]);
    }
  }, [dataset.name, dataset.rowCount, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

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
            <ResponsiveContainer width="100%" height={250}>
              <LineChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey={config.xKey} stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip />
                {config.dataKeys.map((k, i) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          );
        case 'pie':
           // Simple aggregation for pie
           const aggData = React.useMemo(() => {
             const counts: Record<string, number> = {};
             dataset.rows.forEach(r => {
               const key = String(r[config.xKey]);
               const val = Number(r[config.dataKeys[0]]) || 1; 
               counts[key] = (counts[key] || 0) + val;
             });
             return Object.entries(counts).slice(0, 6).map(([name, value]) => ({ name, value }));
          }, [dataset, config]);
          
          return (
             <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={aggData} innerRadius={50} outerRadius={70} dataKey="value">
                  {aggData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
             </ResponsiveContainer>
          );
        case 'scatter':
            return (
                <ResponsiveContainer width="100%" height={250}>
                    <ScatterChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey={config.xKey} name={config.xKey} fontSize={10} />
                        <YAxis type="number" dataKey={config.dataKeys[0]} name={config.dataKeys[0]} fontSize={10} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name={config.title} data={chartData} fill={COLORS[0]} />
                    </ScatterChart>
                </ResponsiveContainer>
            );
        default:
          return (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey={config.xKey} stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                {config.dataKeys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          );
      }
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: textToSend, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Default chat behavior
    let responseText = "";
    
    // Check for "Auto Clean" intent
    if (textToSend.toLowerCase().includes("auto clean")) {
        // Perform local cleaning
        const cleanedData = autoCleanDataset(dataset);
        onDatasetUpdate(cleanedData); // Update app state
        
        // Construct a special prompt for Gemini to acknowledge the cleaning
        const profileSummary = cleanedData.profile.map(p => `${p.name} (${p.type}): ${p.missingCount} missing`).join('\n');
        
        // We simulate the system "telling" Gemini what happened so it can inform the user
        const systemPrompt = `
          SYSTEM UPDATE: The user requested automatic cleaning. 
          The application has successfully imputed missing values (Mean for numbers, 'Unknown' for categorical).
          The NEW dataset profile is:
          ${profileSummary}
          
          Please generate a response to the user summarizing:
          1. That data cleaning is complete.
          2. The current quality state (highlight that missing values are resolved).
          3. Ask what analysis they would like to perform now (trends, top performers, etc.).
        `;

        // Update suggestions for the NEXT phase
        setSuggestions([
            "Analyze sales trends",
            "Identify top performing categories",
            "Show me a summary dashboard"
        ]);

        // Send this special context to Gemini
        const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        responseText = await chatWithData(cleanedData, history, systemPrompt); // Pass cleanedData

    } else {
         // Normal chat flow
         if (textToSend.toLowerCase().includes("skip") || textToSend.toLowerCase().includes("manual")) {
             setSuggestions([
                 "Analyze sales trends",
                 "Identify top performing categories",
                 "Show me a summary dashboard"
             ]);
         }

         const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
         responseText = await chatWithData(dataset, history, textToSend);
    }
    
    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: Date.now() }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Define Your Analysis Goal</h2>
        <p className="text-slate-500">Chat with Gemini to refine what you want to see.</p>
      </div>

      <div className="flex-grow bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Chat Area */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-50" ref={scrollRef}>
           {messages.map((msg, idx) => (
             <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white'}`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                   </div>
                   <div className={`p-4 rounded-2xl text-sm leading-relaxed overflow-hidden ${
                     msg.role === 'user' 
                     ? 'bg-slate-200 text-slate-800 rounded-tr-none' 
                     : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                   }`}>
                     <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'text-slate-800' : 'text-slate-700'}`}
                        components={{
                          pre: ({node, ...props}) => <div className="not-prose" {...props} />, // Disable prose styling for pre to handle code blocks manually
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({node, ...props}) => <span className="font-bold text-slate-900" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 mb-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 mb-2" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                          code: ({node, className, children, ...props}) => {
                              const match = /language-(\w+)/.exec(className || '');
                              const lang = match ? match[1] : '';
                              const content = String(children).trim();
                              
                              // Detect chart if explicitly json-chart OR if json contains specific keys
                              const isChart = lang === 'json-chart' || 
                                             (lang === 'json' && 
                                              content.includes('"type"') && 
                                              content.includes('"dataKeys"'));
                              
                              if (isChart) {
                                  try {
                                      const config = JSON.parse(content);
                                      if (config.type && config.dataKeys) {
                                          return (
                                              <div className="my-4 p-4 bg-slate-50 border border-slate-100 rounded-xl w-full min-h-[300px] shadow-sm">
                                                  <p className="text-xs font-bold text-slate-500 uppercase mb-4 text-center tracking-wider">{config.title}</p>
                                                  {renderChart(config)}
                                              </div>
                                          );
                                      }
                                  } catch (e) {
                                      // Failed to parse, fall back to code block
                                  }
                              }

                              // Fallback for code blocks (if language matches)
                              if (match) {
                                return (
                                  <div className="bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs font-mono my-2 shadow-inner">
                                     <code className={className} {...props}>{children}</code>
                                  </div>
                                );
                              }
                              
                              // Inline code
                              return <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded text-xs font-mono font-medium" {...props}>{children}</code>;
                          }
                        }}
                     >
                        {msg.text}
                     </ReactMarkdown>
                   </div>
                </div>
             </div>
           ))}
           {isTyping && (
             <div className="flex justify-start">
               <div className="flex max-w-[80%] gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="animate-pulse" />
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                  </div>
               </div>
             </div>
           )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
           {!isTyping && suggestions.length > 0 && (
             <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
               {suggestions.map((s, i) => (
                 <button 
                   key={i}
                   onClick={() => handleSend(s)}
                   className="whitespace-nowrap px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full hover:bg-indigo-100 transition-colors border border-indigo-100"
                 >
                   {s}
                 </button>
               ))}
             </div>
           )}

           <div className="flex gap-3">
             <div className="relative flex-grow">
               <input
                 type="text"
                 className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
                 placeholder="Describe what you want to analyze..."
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={handleKeyDown}
                 disabled={isTyping}
               />
               <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                 <Send size={18} />
               </button>
             </div>
             
             {messages.length > 2 && (
               <button
                 onClick={() => {
                     // Find the last user message that isn't about cleaning
                     const lastUserAnalysisMsg = [...messages].reverse().find(m => m.role === 'user' && !m.text.includes("Clean") && !m.text.includes("Skip"));
                     const obj = lastUserAnalysisMsg ? lastUserAnalysisMsg.text : "Executive Summary";
                     onObjectiveSet(obj);
                 }}
                 className="px-6 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200 whitespace-nowrap"
               >
                 Build Dashboard
               </button>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ObjectiveStage;
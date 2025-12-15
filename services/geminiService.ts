import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Dataset, ChartConfig, Insight } from '../types';

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY not found in environment");
    return new GoogleGenAI({ apiKey });
};

export const analyzeDataProfile = async (dataset: Dataset): Promise<string> => {
  const ai = getClient();
  const profileSummary = dataset.profile.map(p => 
    `- Column "${p.name}" (${p.type}): ${p.missingPercentage.toFixed(1)}% missing. Examples: ${p.sampleValues.join(', ')}`
  ).join('\n');

  const prompt = `
    You are an expert data analyst. I have uploaded a dataset named "${dataset.name}" with ${dataset.rowCount} rows.
    
    Here is the column profile:
    ${profileSummary}
    
    Please provide a concise, professional executive summary of this dataset. 
    Highlight potential data quality issues (missing values, weird formats) and suggest 3 analytical opportunities.
    Keep it under 200 words. Format with Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating analysis. Please check your API key.";
  }
};

export const generateDashboardPlan = async (
  dataset: Dataset, 
  objective: string
): Promise<{ charts: ChartConfig[], insights: Insight[] }> => {
  const ai = getClient();
  
  // Sample data to help the model understand the context better, but limit to save tokens
  const sampleRows = JSON.stringify(dataset.rows.slice(0, 10));
  const profileSummary = dataset.profile.map(p => `${p.name} (${p.type})`).join(', ');

  const prompt = `
    I have a dataset with columns: ${profileSummary}.
    A sample of the data is: ${sampleRows}

    My objective is: "${objective}"

    Based on this, generate a dashboard configuration.
    1. Provide 2-4 charts that visualize relevant metrics for this objective.
    2. Provide 2-3 key textual insights or "call-outs" that an executive should know.

    The output must be strictly JSON.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      charts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['bar', 'line', 'area', 'pie', 'scatter'] },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            xKey: { type: Type.STRING, description: "The key in the data object to use for X axis" },
            dataKeys: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of keys for Y axis values" }
          },
          required: ['id', 'type', 'title', 'xKey', 'dataKeys']
        }
      },
      insights: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['success', 'warning', 'info'] },
            title: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ['type', 'title', 'content']
        }
      }
    },
    required: ['charts', 'insights']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Dashboard Gen Error:", error);
    return {
      charts: [],
      insights: [{ type: 'warning', title: 'Generation Failed', content: 'Could not generate dashboard configuration.' }]
    };
  }
};

export const chatWithData = async (
  dataset: Dataset,
  history: { role: string, parts: { text: string }[] }[],
  message: string
): Promise<string> => {
    const ai = getClient();
    const profileSummary = dataset.profile.map(p => `${p.name} (${p.type})`).join(', ');

    const systemInstruction = `
      You are AutoAnalyst, a helpful data assistant. 
      The user has uploaded a dataset with columns: ${profileSummary}.

      YOUR GOAL: Help the user understand and clean their data, then define analysis goals.

      IF the user asks to "clean" the data or "fix" issues:
      - Acknowledge that you can help them clean it (either automatically or manually).
      - If they select 'Auto Clean', the system will provide you with the updated profile. You should then summarize the changes.
      - If they want manual help, guide them column by column.

      IF the user asks for charts/graphs:
      - You can generate a chart by returning a JSON block with the language "json-chart". 
      - The schema for json-chart is:
      {
         "type": "bar" | "line" | "pie" | "scatter",
         "title": "Chart Title",
         "xKey": "ColumnNameForX",
         "dataKeys": ["ColumnNameForY"]
      }
      - DO NOT generate python code.

      General Rules:
      - Be concise.
      - Use Markdown for formatting (bold, lists).
    `;

    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction },
            history: history
        });

        const result = await chat.sendMessage({ message });
        return result.text;
    } catch (e) {
        console.error(e);
        return "I'm having trouble connecting to my brain right now.";
    }
}
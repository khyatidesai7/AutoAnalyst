import { DataType, ColumnProfile, Dataset } from './types';

export const detectType = (value: any): DataType => {
  if (value === null || value === undefined || value === '') return DataType.UNKNOWN;
  if (!isNaN(Number(value))) return DataType.NUMBER;
  if (Date.parse(value) && isNaN(Number(value))) return DataType.DATE; // Basic date check
  if (value === 'true' || value === 'false' || value === true || value === false) return DataType.BOOLEAN;
  return DataType.STRING;
};

export const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV split (Note: robust CSV parsing usually requires a library like PapaParse for edge cases)
    // We are handling simple comma separation here for the demo.
    const rowValues = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => {
       let v = val.trim();
       if (v.startsWith('"') && v.endsWith('"')) {
         v = v.substring(1, v.length - 1);
       }
       // Try to convert to number if possible
       if (!isNaN(Number(v)) && v !== '') {
          return Number(v);
       }
       return v;
    });

    if (rowValues.length === headers.length) {
      const rowObj: any = {};
      headers.forEach((h, index) => {
        rowObj[h] = rowValues[index];
      });
      data.push(rowObj);
    }
  }
  return data;
};

export const profileDataset = (data: any[], fileName: string): Dataset => {
  if (data.length === 0) {
    return { name: fileName, rows: [], columns: [], profile: [], rowCount: 0 };
  }

  const columns = Object.keys(data[0]);
  const rowCount = data.length;
  
  const profile: ColumnProfile[] = columns.map(col => {
    const values = data.map(row => row[col]);
    const definedValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const missingCount = rowCount - definedValues.length;
    
    // Type inference based on non-empty values
    let type = DataType.UNKNOWN;
    if (definedValues.length > 0) {
        // Check first 50 defined values to guess type
        const sampleCheck = definedValues.slice(0, 50);
        const types = sampleCheck.map(detectType);
        // If mostly numbers, call it number
        const numCount = types.filter(t => t === DataType.NUMBER).length;
        if (numCount > sampleCheck.length * 0.8) type = DataType.NUMBER;
        else {
           const dateCount = types.filter(t => t === DataType.DATE).length;
           if (dateCount > sampleCheck.length * 0.8) type = DataType.DATE;
           else type = DataType.STRING;
        }
    }

    const uniqueValues = new Set(definedValues);
    
    // Basic min/max for numbers
    let min, max;
    if (type === DataType.NUMBER && definedValues.length > 0) {
       min = Math.min(...(definedValues as number[]));
       max = Math.max(...(definedValues as number[]));
    }

    return {
      name: col,
      type,
      missingCount,
      missingPercentage: (missingCount / rowCount) * 100,
      uniqueCount: uniqueValues.size,
      sampleValues: Array.from(uniqueValues).slice(0, 5),
      min,
      max
    };
  });

  return {
    name: fileName,
    rows: data,
    columns,
    profile,
    rowCount
  };
};

export const autoCleanDataset = (dataset: Dataset): Dataset => {
  // Deep copy rows to avoid mutating original
  const newRows = dataset.rows.map(r => ({...r}));
  const profile = dataset.profile;

  profile.forEach(col => {
    if (col.missingCount > 0) {
      if (col.type === DataType.NUMBER) {
        // Calculate mean of existing values
        const values = newRows.map(r => r[col.name]).filter(v => typeof v === 'number');
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = values.length > 0 ? sum / values.length : 0;
        
        // Impute missing
        newRows.forEach(r => {
            if (r[col.name] === null || r[col.name] === undefined || r[col.name] === '') {
                r[col.name] = Number(mean.toFixed(2));
            }
        });
      } else {
        // Fill text/categorical with "Unknown"
        newRows.forEach(r => {
             if (r[col.name] === null || r[col.name] === undefined || r[col.name] === '') {
                r[col.name] = "Unknown"; 
            }
        });
      }
    }
  });

  // Re-profile the dataset to update stats
  return profileDataset(newRows, dataset.name);
};
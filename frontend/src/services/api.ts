const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Simple token storage
let authToken = 'demo-researcher-token';

export const setAuthToken = (token: string) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export interface AnalysisPrediction {
  class: 'Glioma' | 'Meningioma' | 'Pituitary' | 'None';
  confidence: number;
  probabilities: {
    Glioma: number;
    Meningioma: number;
    Pituitary: number;
    None: number;
  };
}

export interface AnalysisExplanation {
  summary: string;
  predicted_category: string;
  confidence_statement: string;
  educational_explanation: string;
  limitations: string;
  general_next_steps: string[];
  red_flags?: string[];
  disclaimer: string;
}

export interface AnalysisResult {
  success: boolean;
  analysis_id: string;
  prediction: AnalysisPrediction;
  explanation: AnalysisExplanation;
  report: {
    available: boolean;
    download_url?: string;
  };
}

export async function uploadAndAnalyzeMRI(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/prediction/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(err.error || 'Server error during analysis');
  }

  return response.json();
}

export async function fetchAnalysisHistory() {
  const response = await fetch(`${API_BASE_URL}/history`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
}

export function getReportDownloadUrl(analysisId: string) {
  return `${API_BASE_URL}/reports/${analysisId}`;
}

export async function downloadReportFile(analysisId: string, filename?: string) {
  const url = getReportDownloadUrl(analysisId);
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    if (!response.ok) throw new Error('PDF download failed');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `NeuroScan_Report_${analysisId.slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (e) {
    // Fallback direct browser navigation
    window.open(url, '_blank');
  }
}


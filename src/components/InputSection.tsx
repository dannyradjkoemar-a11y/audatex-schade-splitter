import React, { useState, useRef } from 'react';
import { AnalyseResultaat } from '../types/audatex';
import { parseAudatexReport } from '../utils/audatexParser';
import { apiUrl, getApiBase } from '../utils/apiConfig';
import { 
  UploadCloud, 
  FileText, 
  AlertCircle, 
  Loader2, 
  FileCode,
  Play,
  X,
  Search
} from 'lucide-react';

interface InputSectionProps {
  onLoadData: (data: AnalyseResultaat) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onCancel?: () => void;
  isCompact?: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({
  onLoadData,
  isLoading,
  setIsLoading,
  onCancel,
  isCompact = false
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Read file as UTF-8 text
  const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file, 'utf-8');
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = error => reject(error);
    });
  };

  const parseResponseJsonSafe = async (response: Response): Promise<any> => {
    const raw = await response.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {
        error:
          response.status === 413
            ? 'Het geüploade bestand is te groot voor directe verwerking.'
            : `Onverwacht serverantwoord (HTTP ${response.status}).`
      };
    }
  };

  // Submit file for processing
  const handleAnalyzeFile = async () => {
    if (!selectedFile) {
      setErrorMsg('Selecteer eerst een Audatex PDF, TXT of afbeeldingsbestand.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const isTxt =
        selectedFile.type.includes('text') ||
        selectedFile.name.toLowerCase().endsWith('.txt');

      // Als de app offline/als los HTML-bestand draait, verwerk .txt direct lokaal
      if (window.location.protocol === 'file:') {
        if (!isTxt) {
          throw new Error('In de offline HTML-versie kunnen .txt-exports en geplakte calculatietekst direct worden ingelezen. Voor PDF/OCR-scans gebruikt u de webapplicatie.');
        }
        const txtContent = await fileToText(selectedFile);
        const localParsed = parseAudatexReport(txtContent);
        if (!localParsed || localParsed.regels.length === 0) {
          throw new Error('Geen geldige Audatex calculatieregels herkend in het .txt bestand.');
        }
        onLoadData(localParsed);
        return;
      }

      const base64Data = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || (isTxt ? 'text/plain' : 'application/pdf');

      try {
        const response = await fetch(apiUrl('/api/analyze-audatex'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64Data,
            mimeType,
            fileName: selectedFile.name
          })
        });

        const data = await parseResponseJsonSafe(response);

        if (!response.ok) {
          if (response.status === 404 && !getApiBase() && !isTxt) {
            throw new Error(
              'PDF-uitlezing vereist een gekoppelde Node-backend (VITE_API_BASE). Gebruik op GitHub Pages het tabblad "Calculatietekst Plakken" of upload een .txt-export.'
            );
          }
          throw new Error(data.error || 'Fout bij verwerken van document.');
        }

        if (data.result) {
          onLoadData(data.result);
        } else {
          throw new Error('Onverwacht antwoordformaat van de server.');
        }
      } catch (networkErr: any) {
        if (isTxt) {
          const txtContent = await fileToText(selectedFile);
          const localParsed = parseAudatexReport(txtContent);
          if (localParsed && localParsed.regels.length > 0) {
            onLoadData(localParsed);
            return;
          }
        }
        throw networkErr;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Er is een fout opgetreden bij het verwerken van het bestand.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit pasted text for processing
  const handleAnalyzeText = async () => {
    if (!pastedText.trim()) {
      setErrorMsg('Voer eerst de Audatex calculatietekst in.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Snelle lokale parsing voor standalone HTML (file://) of als directe voorverwerking
      if (window.location.protocol === 'file:') {
        const localParsed = parseAudatexReport(pastedText);
        if (localParsed && localParsed.regels.length > 0) {
          onLoadData(localParsed);
          return;
        }
        throw new Error('Kon de geplakte tekst niet herkennen als Audatex calculatie.');
      }

      try {
        const response = await fetch(apiUrl('/api/analyze-audatex'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: pastedText
          })
        });

        const data = await parseResponseJsonSafe(response);

        if (!response.ok) {
          throw new Error(data.error || 'Fout bij verwerken van tekst.');
        }

        if (data.result) {
          onLoadData(data.result);
        } else {
          throw new Error('Geen geldige data geëxtraheerd uit de tekst.');
        }
      } catch (networkErr: any) {
        const localParsed = parseAudatexReport(pastedText);
        if (localParsed && localParsed.regels.length > 0) {
          onLoadData(localParsed);
          return;
        }
        throw networkErr;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Er is een fout opgetreden bij het verwerken van de tekst.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header / Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'text'
                ? 'bg-white text-slate-900 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Calculatietekst Plakken</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-white text-slate-900 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload PDF / TXT / Scan</span>
          </button>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="px-3.5 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB CONTENT: RAW TEXT PASTE */}
      {activeTab === 'text' && (
        <div className="p-4 sm:p-6 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-1">
              Plak de Solera Audatex calculatietekst:
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Het kenteken wordt automatisch uitgelezen en gekoppeld aan RDW Open Data voor de voertuigspecificaties en indicatieve dagwaarde.
            </p>
          </div>

          <textarea
            rows={isCompact ? 6 : 9}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Plak hier de tekst van de Audatex calculatie (inclusief kenteken, onderdelen, bewerkingen, spuittijd en tarieven)..."
            className="w-full bg-slate-50 border border-slate-300 rounded p-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>Automatische herkenning van kenteken, 6 voertuigzones, spuittijd (in AE) en TZ 143.</span>
            </span>
            <button
              onClick={handleAnalyzeText}
              disabled={!pastedText.trim() || isLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold transition-colors shadow-2xs ${
                pastedText.trim() && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Calculatie inlezen...
                </>
              ) : (
                <>
                  <FileCode className="w-3.5 h-3.5" />
                  Calculatie Inlezen & Splitsen
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: UPLOAD PDF/SCAN */}
      {activeTab === 'upload' && (
        <div className={isCompact ? 'p-4' : 'p-6 sm:p-8'}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,text/plain,image/png,image/jpeg,image/jpg"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-600 rounded-lg p-6 sm:p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-white transition-colors"
          >
            <div className="w-10 h-10 mx-auto mb-2.5 rounded bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
              <UploadCloud className="w-5 h-5" />
            </div>

            {selectedFile ? (
              <div>
                <p className="text-xs font-bold text-slate-900 mb-0.5">
                  Geselecteerd bestand: <span className="text-blue-700 font-mono">{selectedFile.name}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Klik om een ander bestand te kiezen
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-900 mb-0.5">
                  Selecteer een Solera Audatex calculatie (PDF, TXT of Scan)
                </p>
                <p className="text-[11px] text-slate-500">
                  Klik om te bladeren of sleep een .pdf, .txt of .png/.jpg bestand hierheen
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Ondersteunt officiële Audatex calculaties en Audapad exports.
            </span>
            <button
              onClick={handleAnalyzeFile}
              disabled={!selectedFile || isLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold transition-colors shadow-2xs ${
                selectedFile && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Calculatie verwerken...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Calculatie Verwerken
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { PageCard } from './components/PageCard';
import { MetadataModal } from './components/MetadataModal';
import { EditorModal } from './components/EditorModal';
import { 
  getPdfDetails, 
  renderPageToDataURL, 
  getPdfDocument, 
  movePage, 
  removePage,
  mergePdfs,
  getMetadata,
  updateMetadata,
  savePdf,
  applyFiltersToPage,
  addTextToPage
} from './utils/pdfUtils';
import { PdfMetadata, PageFilter, BorderConfig, TextConfig } from './types';
import { Loader2, FileUp, Sparkles } from 'lucide-react';

export default function App() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pages, setPages] = useState<string[]>([]); // DataURLs for thumbnails
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Modals
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [currentMetadata, setCurrentMetadata] = useState<PdfMetadata | null>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);

  // Load PDF and generate thumbnails
  const loadPdf = useCallback(async (bytes: Uint8Array) => {
    setLoading(true);
    setLoadingText('Processing PDF...');
    try {
      setPdfBytes(bytes);
      const { thumbnails } = await getPdfDetails(bytes);
      setPages(thumbnails);
    } catch (err) {
      console.error(err);
      alert('Error loading PDF');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setLoadingText('Loading file...');
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileName(file.name);
      await loadPdf(bytes);
    } catch (err) {
      console.error(err);
      alert('Failed to load file');
      setLoading(false);
    }
  };

  const handleMerge = async (file: File) => {
    if (!pdfBytes) return;
    setLoading(true);
    setLoadingText('Merging PDFs...');
    try {
      const buffer = await file.arrayBuffer();
      const mergeBytes = new Uint8Array(buffer);
      const newPdfBytes = await mergePdfs(pdfBytes, mergeBytes);
      await loadPdf(newPdfBytes);
    } catch (err) {
      console.error(err);
      alert('Failed to merge PDF');
      setLoading(false);
    }
  };

  const handleMovePage = async (from: number, to: number) => {
    if (!pdfBytes) return;
    if (to < 0 || to >= pages.length) return;
    
    setLoading(true);
    setLoadingText('Reordering...');
    try {
      const newBytes = await movePage(pdfBytes, from, to);
      await loadPdf(newBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = async (index: number) => {
    if (!pdfBytes) return;
    setLoading(true);
    setLoadingText('Deleting page...');
    try {
      const newBytes = await removePage(pdfBytes, index);
      await loadPdf(newBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edited_${fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openMetadata = async () => {
    if (!pdfBytes) return;
    const meta = await getMetadata(pdfBytes);
    setCurrentMetadata(meta);
    setMetadataModalOpen(true);
  };

  const saveMetadata = async (newMeta: PdfMetadata) => {
    if (!pdfBytes) return;
    setMetadataModalOpen(false);
    setLoading(true);
    try {
      const newBytes = await updateMetadata(pdfBytes, newMeta);
      setPdfBytes(newBytes);
    } catch (err) {
      console.error(err);
      alert('Failed to save metadata');
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (index: number) => {
    setSelectedPageIndex(index);
    setEditorModalOpen(true);
  };

  const handleApplyFilters = async (filters: PageFilter, border: BorderConfig) => {
    if (!pdfBytes || selectedPageIndex === null) return;
    setLoading(true);
    setLoadingText('Applying edits...');
    try {
      const newBytes = await applyFiltersToPage(pdfBytes, selectedPageIndex, filters, border);
      await loadPdf(newBytes);
    } catch (err) {
      console.error(err);
      alert('Failed to apply changes');
      setLoading(false);
    }
  };

  const handleAddText = async (config: TextConfig) => {
    if (!pdfBytes || selectedPageIndex === null) return;
    setLoading(true);
    setLoadingText('Adding text...');
    try {
      const newBytes = await addTextToPage(pdfBytes, selectedPageIndex, config);
      await loadPdf(newBytes);
    } catch (err) {
      console.error(err);
      alert('Failed to add text');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Subtle Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      <Toolbar 
        onUpload={handleFileUpload} 
        onMerge={handleMerge}
        onSave={handleSave}
        onMetadata={openMetadata}
        hasFile={!!pdfBytes}
        fileName={fileName}
      />

      <main className="flex-1 p-6 md:p-10 z-10 overflow-y-auto">
        {!pdfBytes ? (
          <div className="flex flex-col items-center justify-center h-[75vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
             <div className="relative group">
               <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
               <div className="relative w-32 h-32 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-800">
                  <Sparkles className="w-12 h-12 text-indigo-400 opacity-80" />
               </div>
             </div>
             
             <div className="space-y-3 max-w-lg mx-auto">
               <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                 Mini-Project
               </h1>
               <p className="text-slate-400 text-lg leading-relaxed">
                 Professional client-side PDF editing. Secure, fast, and local.
               </p>
             </div>

             <button 
                className="group bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-1 hover:shadow-indigo-500/40 flex items-center gap-3"
                onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
             >
                <FileUp className="w-5 h-5 group-hover:animate-bounce" />
                Select PDF Document
             </button>
             
             <div className="text-slate-600 text-sm font-medium">
               Drag and drop or click to upload
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {pages.map((img, idx) => (
              <PageCard 
                key={idx} 
                index={idx} 
                imageUrl={img} 
                total={pages.length}
                onEdit={openEditor}
                onMove={handleMovePage}
                onDelete={handleDeletePage}
              />
            ))}
          </div>
        )}
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-[100] transition-opacity duration-300">
          <div className="relative">
            <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
          </div>
          <p className="text-slate-200 text-lg font-medium mt-6 tracking-wide">{loadingText}</p>
        </div>
      )}

      {/* Modals */}
      <MetadataModal 
        isOpen={metadataModalOpen}
        onClose={() => setMetadataModalOpen(false)}
        initialMetadata={currentMetadata}
        onSave={saveMetadata}
      />

      <EditorModal 
        isOpen={editorModalOpen}
        pageIndex={selectedPageIndex}
        pageImage={selectedPageIndex !== null ? pages[selectedPageIndex] : null}
        onClose={() => setEditorModalOpen(false)}
        onApplyFilters={handleApplyFilters}
        onAddText={handleAddText}
      />
    </div>
  );
}
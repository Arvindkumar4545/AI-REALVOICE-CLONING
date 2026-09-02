import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ALLOWED_EXTENSIONS = ['.wav', '.flac', '.mp3', '.ogg', '.m4a'];
const MAX_SIZE_MB = 50;

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFileSelected, disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateAndHandleFile = (file: File) => {
    setValidationError(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setValidationError(`Unsupported file extension (${ext}). Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setValidationError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds ${MAX_SIZE_MB}MB limit.`);
      return;
    }

    if (file.size === 0) {
      setValidationError('Audio file is empty (0 bytes).');
      return;
    }

    setSelectedFile(file);
    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) fileInputRef.current?.click();
        }}
        className={`glass-panel p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center space-y-4 ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
            : 'border-slate-700/80 hover:border-cyan-500/50 hover:bg-slate-900/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.flac,.mp3,.ogg,.m4a,audio/*"
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-white">
            {selectedFile ? selectedFile.name : 'Upload Audio File for Deepfake Scan'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Drag & drop or click to browse. Supports WAV, FLAC, MP3, OGG, M4A (Max 50MB)
          </p>
        </div>

        {selectedFile && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Analysis</span>
          </div>
        )}
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};

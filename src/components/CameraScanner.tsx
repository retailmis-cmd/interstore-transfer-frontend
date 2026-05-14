'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, ZapOff, RefreshCw } from 'lucide-react';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastTextRef = useRef('');
  const lastTimeRef = useRef(0);

  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasFlip, setHasFlip] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setError('');
      setReady(false);

      try {
        // Step 1: Start camera with facingMode constraint via getUserMedia
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
        });
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        if (!alive) return;

        setReady(true);

        // Step 2: decodeFromVideoElement reads frames from the already-playing video
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (!result || !alive) return;
          const text = result.getText();
          const now = Date.now();
          if (text === lastTextRef.current && now - lastTimeRef.current < 1500) return;
          lastTextRef.current = text;
          lastTimeRef.current = now;
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
          navigator.vibrate?.(80);
          onScan(text);
        });

        if (!alive) { controls.stop(); return; }
        controlsRef.current = controls;

        // Step 3: Enumerate cameras for flip button (only populated after permission)
        const devs = await navigator.mediaDevices.enumerateDevices();
        if (alive) setHasFlip(devs.filter((d) => d.kind === 'videoinput').length > 1);
      } catch {
        if (alive) setError('Camera access denied. Please allow camera permission and try again.');
      }
    };

    run();

    return () => {
      alive = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode, onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-slate-800">Camera Scanner</h3>
          </div>
          <div className="flex items-center gap-2">
            {hasFlip && (
              <button
                onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
                className="text-xs text-brand-600 border border-brand-200 rounded-lg px-2.5 py-1 hover:bg-brand-50 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Flip
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Camera view */}
        {error ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <ZapOff className="w-10 h-10 text-slate-300" />
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => setFacingMode((f) => f)}
              className="btn-primary text-sm px-4 py-2"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className={`relative bg-black aspect-[4/3] ${flash ? 'ring-4 ring-inset ring-green-400' : ''}`}>
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />

            {/* Scan overlay — only show once video is playing */}
            {ready && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-28 relative">
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-brand-400 rounded-tl" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-brand-400 rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-brand-400 rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-brand-400 rounded-br" />
                  <div className="absolute inset-x-2 top-1/2 h-px bg-brand-400 opacity-80 animate-pulse" />
                </div>
              </div>
            )}

            {/* Spinner while camera is starting */}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 text-center bg-slate-50">
          <p className="text-sm font-medium text-slate-700">Aim at the barcode</p>
          <p className="text-xs text-slate-400 mt-0.5">Item is added automatically on each scan</p>
        </div>
      </div>
    </div>
  );
}

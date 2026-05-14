'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { IScannerControls } from '@zxing/browser';
import { X, Camera, ZapOff } from 'lucide-react';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScannedRef = useRef<string>('');
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState('');
  const [flashColor, setFlashColor] = useState<'green' | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>(undefined);

  const startScanner = useCallback(async (deviceId?: string) => {
    if (!videoRef.current) return;
    // Stop any existing scanner
    controlsRef.current?.stop();
    controlsRef.current = null;

    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        deviceId ?? undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            const text = result.getText();
            // Cooldown: ignore same barcode scanned within 1.5 seconds
            if (text === lastScannedRef.current) return;
            lastScannedRef.current = text;
            if (cooldownRef.current) clearTimeout(cooldownRef.current);
            cooldownRef.current = setTimeout(() => {
              lastScannedRef.current = '';
            }, 1500);

            // Visual + haptic feedback
            setFlashColor('green');
            setTimeout(() => setFlashColor(null), 400);
            if (navigator.vibrate) navigator.vibrate(80);

            onScan(text);
          }
        }
      );
      controlsRef.current = controls;
    } catch {
      setError('Camera access denied. Please allow camera permission and try again.');
    }
  }, [onScan]);

  // Load available cameras
  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devs) => {
        setDevices(devs);
        // Prefer back camera on mobile
        const back = devs.find(
          (d) => /back|rear|environment/i.test(d.label)
        );
        const chosen = back?.deviceId ?? devs[0]?.deviceId;
        setSelectedDevice(chosen);
      })
      .catch(() => {
        setError('Unable to access camera. Please check permissions.');
      });
  }, []);

  // Start scanner once a device is selected
  useEffect(() => {
    if (selectedDevice !== undefined) {
      startScanner(selectedDevice);
    }
    return () => {
      controlsRef.current?.stop();
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, [selectedDevice, startScanner]);

  const switchCamera = () => {
    if (devices.length < 2) return;
    const currentIdx = devices.findIndex((d) => d.deviceId === selectedDevice);
    const nextIdx = (currentIdx + 1) % devices.length;
    setSelectedDevice(devices[nextIdx].deviceId);
  };

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
            {devices.length > 1 && (
              <button
                onClick={switchCamera}
                className="text-xs text-brand-600 border border-brand-200 rounded-lg px-2.5 py-1 hover:bg-brand-50 transition-colors"
              >
                Flip Camera
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
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
              onClick={() => { setError(''); startScanner(selectedDevice); }}
              className="btn-primary text-sm px-4 py-2"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="relative bg-black aspect-[4/3]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Dim corners */}
              <div className="absolute inset-0 bg-black/40" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 30%, 15% 30%, 15% 70%, 85% 70%, 85% 30%, 0% 30%)' }} />

              {/* Scan box */}
              <div
                className={`w-64 h-28 rounded-lg relative transition-all duration-200 ${
                  flashColor === 'green' ? 'ring-4 ring-green-400' : ''
                }`}
              >
                {/* Corners */}
                <span className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-brand-400 rounded-tl" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-brand-400 rounded-tr" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-brand-400 rounded-bl" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-brand-400 rounded-br" />

                {/* Scan line animation */}
                <div className="absolute inset-x-2 top-1/2 h-px bg-brand-400 opacity-80 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="px-5 py-3 text-center bg-slate-50">
          <p className="text-sm font-medium text-slate-700">Aim at the barcode</p>
          <p className="text-xs text-slate-400 mt-0.5">Item is added automatically on each scan</p>
        </div>
      </div>
    </div>
  );
}

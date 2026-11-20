import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Film, RotateCcw, Volume2, VolumeX } from 'lucide-react';

export interface CinemaIntroProps {
  onFinish: () => void;
}

export const CinemaIntro: React.FC<CinemaIntroProps> = ({ onFinish }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onFinishRef = useRef(onFinish);
  const closingRef = useRef(false);

  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const baseUrl =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
      ? import.meta.env.BASE_URL
      : '/';
  const videoSrc = baseUrl.endsWith('/')
    ? `${baseUrl}assets/aistudio/Audatex_vehicle_damage_assessmen__b68e1c64_9ee6d9b3.mp4`
    : `${baseUrl}/assets/aistudio/Audatex_vehicle_damage_assessmen__b68e1c64_9ee6d9b3.mp4`;

  const triggerClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsExiting(true);
    window.setTimeout(() => {
      onFinishRef.current?.();
    }, 550);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Fallback silently if browser prevents initial autoplay; user still has controls & skip
      });
    }
  }, []);

  const handleToggleMute = () => {
    const video = videoRef.current;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (video) {
      video.muted = nextMuted;
      if (!nextMuted && video.paused) {
        video.play().catch(() => {});
      }
    }
  };

  const handleReplay = () => {
    const video = videoRef.current;
    closingRef.current = false;
    setIsExiting(false);
    setProgress(0);
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration || !Number.isFinite(video.duration)) return;
    setProgress(Math.min(100, (video.currentTime / video.duration) * 100));
  };

  const handleEnded = () => {
    setProgress(100);
    // Hold the final logo frame briefly so the brand title settles cleanly before entering the app
    window.setTimeout(() => {
      triggerClose();
    }, 900);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex flex-col select-none transition-opacity duration-500 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Introductievideo Audatex Schade Splitter"
    >
      {/* Top Bar */}
      <div className="h-14 sm:h-16 bg-black px-4 sm:px-8 flex items-center justify-between border-b border-slate-900/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <Film className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.2em] text-slate-300 uppercase">
            AUDATEX SCHADE SPLITTER
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMute}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors"
            aria-label={isMuted ? 'Geluid aanzetten' : 'Geluid dempen'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Geluid aan</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Geluid uit</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Intro opnieuw afspelen"
            aria-label="Intro opnieuw afspelen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={triggerClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-200 text-slate-950 transition-colors"
          >
            <span>Intro overslaan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Widescreen Video Frame */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {hasError ? (
          <div className="text-center px-6 max-w-md">
            <p className="text-sm font-bold text-white mb-2">
              Audatex Schade Splitter
            </p>
            <p className="text-xs text-slate-400 mb-5">
              De introvideo kon niet worden geladen. Ga direct verder naar de applicatie.
            </p>
            <button
              type="button"
              onClick={triggerClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
            >
              <span>Open applicatie</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted={isMuted}
            playsInline
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => setHasError(true)}
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Bottom Progress Bar */}
      <div className="bg-black px-4 sm:px-8 py-3 border-t border-slate-900/80 shrink-0">
        <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-300 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

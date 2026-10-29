import { useState, useEffect } from 'react';
import { sound } from './soundEffects';

/**
 * Checks if the document is currently in Fullscreen mode across all standard and vendor APIs.
 */
export function isBrowserFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

/**
 * Toggles Fullscreen mode for the entire application.
 */
export async function toggleBrowserFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  const elem = document.documentElement as any;

  try {
    const isFs = isBrowserFullscreen();
    if (!isFs) {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      sound.playKeyClick();
      return true;
    } else {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
      sound.playKeyClick();
      return false;
    }
  } catch (err) {
    console.warn('[PCB-01] Fullscreen toggle not permitted or failed:', err);
    return isBrowserFullscreen();
  }
}

/**
 * Custom React hook that subscribes to fullscreen changes and keyboard shortcuts ('F' key).
 */
export function useFullscreen(enableKeyShortcut = true) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isBrowserFullscreen());

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isBrowserFullscreen());
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enableKeyShortcut) return;

      // Ignore if user is typing in an input, textarea, select, or contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // 'F' or 'f' key toggles Fullscreen (without ctrl/alt/meta modifier)
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        toggleBrowserFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    if (enableKeyShortcut) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (enableKeyShortcut) {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [enableKeyShortcut]);

  return {
    isFullscreen,
    toggleFullscreen: toggleBrowserFullscreen,
  };
}

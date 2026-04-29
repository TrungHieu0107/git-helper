import { useState, useCallback, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { BlameLine, BlameEvent, startGitBlame } from '../lib/repo';
import { toast } from '../lib/toast';

export function useGitBlame() {
  const [blameData, setBlameData] = useState<Record<number, BlameLine>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);

  const startBlame = useCallback(async (filePath: string) => {
    setBlameData({});
    setIsStreaming(true);
    setProgress(0);

    try {
      await startGitBlame(filePath);
    } catch (err) {
      toast.error(`Failed to start blame: ${err}`);
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<BlameEvent>('blame-event', (event) => {
        const payload = event.payload;
        
        if (payload.type === 'Chunk') {
          setBlameData(prev => {
            const next = { ...prev };
            payload.lines.forEach(line => {
              next[line.line_number] = line;
            });
            return next;
          });
          // Update progress (rough estimate if we don't know total lines)
          setProgress(prev => prev + payload.lines.length);
        } else if (payload.type === 'Complete') {
          setIsStreaming(false);
          toast.success('Blame loaded');
        } else if (payload.type === 'Error') {
          setIsStreaming(false);
          toast.error(`Blame error: ${payload.message}`);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return {
    blameData,
    isStreaming,
    progress,
    startBlame
  };
}

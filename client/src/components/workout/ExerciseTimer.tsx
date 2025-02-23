import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ExerciseTimerProps {
  duration: number;  // Duration in seconds
  onComplete?: () => void;
  autoStart?: boolean;
}

export default function ExerciseTimer({ duration, onComplete, autoStart = false }: ExerciseTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const timerRef = useRef<NodeJS.Timeout>();
  const shouldCompleteRef = useRef(false);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            shouldCompleteRef.current = true;
            clearInterval(timerRef.current);
            setIsRunning(false);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (shouldCompleteRef.current) {
      shouldCompleteRef.current = false;

      // Play completion sound
      try {
        const audioContext = new window.AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.5;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.warn('Could not play timer completion sound:', error);
      }

      if (onComplete) {
        onComplete();
      }
    }
  }, [timeLeft, onComplete]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setTimeLeft(duration);
    setIsRunning(false);
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-2xl font-mono">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTimer}
            disabled={timeLeft === 0}
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={resetTimer}
            disabled={timeLeft === duration && !isRunning}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Progress value={progress} />
    </div>
  );
}
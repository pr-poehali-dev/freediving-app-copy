import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

type DisciplineType = 'STA' | 'DYN' | 'CWT';
type PhaseType = 'ready' | 'official-top' | 'performance' | 'bottom-time' | 'surface-protocol' | 'completed';

interface DisciplineConfig {
  name: string;
  officialTop: number;
  bottomTime?: number;
  surfaceProtocol: number;
  maxPerformance: number;
}

const disciplines: Record<DisciplineType, DisciplineConfig> = {
  STA: {
    name: 'Static Apnea (STA)',
    officialTop: 30,
    surfaceProtocol: 15,
    maxPerformance: 600
  },
  DYN: {
    name: 'Dynamic Apnea (DYN)',
    officialTop: 30,
    bottomTime: 10,
    surfaceProtocol: 15,
    maxPerformance: 300
  },
  CWT: {
    name: 'Constant Weight (CWT)',
    officialTop: 30,
    bottomTime: 30,
    surfaceProtocol: 15,
    maxPerformance: 240
  }
};

const Index = () => {
  const [discipline, setDiscipline] = useState<DisciplineType>('STA');
  const [phase, setPhase] = useState<PhaseType>('ready');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [performanceTime, setPerformanceTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const config = disciplines[discipline];

  const playBeep = (frequency: number, duration: number, volume: number = 0.3) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  };

  const startSequence = () => {
    setPhase('official-top');
    setTimeRemaining(config.officialTop);
    setPerformanceTime(0);
    setIsRunning(true);
    toast.success('Official Top начался');
    playBeep(800, 0.3);
  };

  const stopSequence = () => {
    setIsRunning(false);
    setPhase('ready');
    setTimeRemaining(0);
    setPerformanceTime(0);
  };

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (phase === 'official-top') {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setPhase('performance');
            setTimeRemaining(0);
            toast.info('Старт выступления!');
            playBeep(1200, 0.5, 0.4);
            return 0;
          }
          if (prev === 6) playBeep(600, 0.2);
          if (prev <= 5 && prev > 1) playBeep(600, 0.15);
          return prev - 1;
        });
      } else if (phase === 'performance') {
        setPerformanceTime(prev => prev + 1);
        
        if (config.bottomTime && performanceTime === config.bottomTime - 1) {
          setPhase('bottom-time');
          setTimeRemaining(config.bottomTime);
          toast.warning('Bottom Time');
          playBeep(400, 0.4);
        }
      } else if (phase === 'bottom-time') {
        setPerformanceTime(prev => prev + 1);
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setPhase('surface-protocol');
            setTimeRemaining(config.surfaceProtocol);
            toast.info('Всплытие! Surface Protocol');
            playBeep(1000, 0.6, 0.5);
            return config.surfaceProtocol;
          }
          if (prev <= 5) playBeep(500, 0.15);
          return prev - 1;
        });
      } else if (phase === 'surface-protocol') {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setPhase('completed');
            setIsRunning(false);
            toast.success('Протокол завершен!');
            playBeep(1400, 0.8, 0.5);
            return 0;
          }
          if (prev <= 5) playBeep(700, 0.15);
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, phase, timeRemaining, performanceTime, config]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = (): string => {
    switch (phase) {
      case 'official-top': return 'text-yellow-400';
      case 'performance': return 'text-primary';
      case 'bottom-time': return 'text-orange-400';
      case 'surface-protocol': return 'text-destructive';
      case 'completed': return 'text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  const getPhaseTitle = (): string => {
    switch (phase) {
      case 'official-top': return 'OFFICIAL TOP';
      case 'performance': return 'PERFORMANCE TIME';
      case 'bottom-time': return 'BOTTOM TIME';
      case 'surface-protocol': return 'SURFACE PROTOCOL';
      case 'completed': return 'COMPLETED';
      default: return 'READY';
    }
  };

  const progressPercent = phase === 'performance' 
    ? (performanceTime / config.maxPerformance) * 100 
    : phase === 'surface-protocol' 
    ? ((config.surfaceProtocol - timeRemaining) / config.surfaceProtocol) * 100
    : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background via-background to-primary/10">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Icon name="Waves" size={32} className="text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">FREEDIVING COMP</h1>
          </div>
          <p className="text-muted-foreground">Официальный таймер AIDA/CMAS</p>
        </div>

        <Card className="p-6 space-y-6 border-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Дисциплина</label>
            <Select 
              value={discipline} 
              onValueChange={(val) => {
                setDiscipline(val as DisciplineType);
                stopSequence();
              }}
              disabled={isRunning}
            >
              <SelectTrigger className="w-full h-12 text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STA">Static Apnea (STA)</SelectItem>
                <SelectItem value="DYN">Dynamic Apnea (DYN)</SelectItem>
                <SelectItem value="CWT">Constant Weight (CWT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={`text-center py-8 transition-all ${phase !== 'ready' ? 'pulse-ring' : ''}`}>
            <div className={`text-sm font-semibold tracking-widest mb-2 ${getPhaseColor()}`}>
              {getPhaseTitle()}
            </div>
            <div className={`text-8xl font-black tabular-nums ${getPhaseColor()} ${phase !== 'ready' ? 'timer-glow' : ''}`}>
              {phase === 'performance' || phase === 'bottom-time' 
                ? formatTime(performanceTime)
                : phase === 'official-top' || phase === 'surface-protocol'
                ? formatTime(timeRemaining)
                : '00:00'}
            </div>
            {(phase === 'performance' || phase === 'bottom-time') && (
              <div className="text-muted-foreground text-lg mt-2">
                Performance: {formatTime(performanceTime)}
              </div>
            )}
          </div>

          {phase !== 'ready' && phase !== 'completed' && (
            <Progress value={progressPercent} className="h-2" />
          )}

          <div className="flex gap-3">
            {phase === 'ready' || phase === 'completed' ? (
              <Button 
                onClick={startSequence} 
                size="lg" 
                className="flex-1 h-14 text-lg font-semibold"
              >
                <Icon name="Play" size={24} className="mr-2" />
                СТАРТ
              </Button>
            ) : (
              <>
                <Button 
                  onClick={stopSequence} 
                  variant="destructive"
                  size="lg" 
                  className="flex-1 h-14 text-lg font-semibold"
                >
                  <Icon name="Square" size={24} className="mr-2" />
                  СТОП
                </Button>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Official Top</div>
              <div className="text-lg font-semibold">{config.officialTop}s</div>
            </div>
            {config.bottomTime && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Bottom Time</div>
                <div className="text-lg font-semibold">{config.bottomTime}s</div>
              </div>
            )}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Surface Protocol</div>
              <div className="text-lg font-semibold">{config.surfaceProtocol}s</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Max Performance</div>
              <div className="text-lg font-semibold">{formatTime(config.maxPerformance)}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-muted/50 border border-border">
          <div className="flex items-start gap-3">
            <Icon name="Info" size={20} className="text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Official Top:</strong> Подготовка спортсмена (30 сек)</p>
              <p><strong className="text-foreground">Performance:</strong> Выполнение дисциплины</p>
              {config.bottomTime && <p><strong className="text-foreground">Bottom Time:</strong> Время на глубине</p>}
              <p><strong className="text-foreground">Surface Protocol:</strong> Протокол на поверхности (15 сек)</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;

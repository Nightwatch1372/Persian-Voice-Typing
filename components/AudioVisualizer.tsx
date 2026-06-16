import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  stream?: MediaStream | null;
  audioElement?: HTMLAudioElement | null;
  isActive: boolean;
  barColor?: string; // e.g. '#4f46e5'
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, audioElement, isActive, barColor = '#4f46e5' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isActive || (!stream && !audioElement)) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
           ctx.clearRect(0, 0, canvas.width, canvas.height);
           // Draw a flat line
           ctx.fillStyle = barColor;
           ctx.globalAlpha = 0.3;
           const barWidth = 4;
           const gap = 4;
           const barCount = Math.floor(canvas.width / (barWidth + gap));
           for(let i=0; i<barCount; i++) {
               ctx.fillRect(i * (barWidth + gap), canvas.height / 2 - 2, barWidth, 4);
           }
           ctx.globalAlpha = 1.0;
        }
      }
      return;
    }

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128; 
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      if (stream) {
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
      } else if (audioElement) {
        const source = audioCtx.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvas || !ctx) return;
        
        animationRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = 4;
        const gap = 4;
        const totalBars = Math.floor(canvas.width / (barWidth + gap));
        
        // Take a subset of data points to fit the canvas and ignore the highest empty frequencies
        const step = Math.floor(bufferLength * 0.6 / totalBars) || 1;
        
        for (let i = 0; i < totalBars; i++) {
          const dataIndex = i * step;
          const value = dataArray[dataIndex] || 0;
          
          let barHeight = (value / 255) * canvas.height;
          // min height for aesthetics
          if (barHeight < 4) barHeight = 4;

          const x = i * (barWidth + gap);
          const y = (canvas.height - barHeight) / 2;

          ctx.fillStyle = barColor;
          // Adding a nice gradient or opacity effect based on height
          ctx.globalAlpha = 0.5 + (value / 255) * 0.5;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0; // reset
      };

      draw();
      
    } catch(err) {
      console.error("AudioVisualizer Error:", err);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isActive, stream, audioElement, barColor]);

  // Set up initial flat line
  useEffect(() => {
    if (isActive) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = barColor;
          ctx.globalAlpha = 0.3;
          const barWidth = 4;
          const gap = 4;
          const barCount = Math.floor(canvas.width / (barWidth + gap));
          for(let i=0; i<barCount; i++) {
              ctx.fillRect(i * (barWidth + gap), canvas.height / 2 - 2, barWidth, 4);
          }
          ctx.globalAlpha = 1.0;
      }
    }
  }, [isActive, barColor]);

  return (
    <canvas 
        ref={canvasRef} 
        width={300} 
        height={60} 
        className="w-full max-w-[300px] h-[60px] mx-auto transition-opacity duration-300"
    />
  );
};

import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  angle: number;
  spinSpeed: number;
}

const COLORS = [
  '#f6e05e', // Gold
  '#f56565', // Red
  '#ed64a6', // Pink
  '#4299e1', // Blue
  '#48bb78', // Green
  '#ecc94b', // Yellow
  '#9f7aec', // Purple
  '#38b2ac', // Teal
];

export const Confetti: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const pArray: Particle[] = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage of screen width
      y: -10 - Math.random() * 20, // start above screen
      size: 6 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 2, // stagger start times
      duration: 3 + Math.random() * 2, // fall speed
      angle: Math.random() * 360,
      spinSpeed: 5 + Math.random() * 15,
    }));
    setParticles(pArray);
  }, []);

  return (
    <div className="confetti-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}vh`,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.angle}deg)`,
            opacity: 0.8,
            animation: `fall ${p.duration}s linear ${p.delay}s infinite, spin ${p.spinSpeed}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          0% {
            top: -10vh;
            transform: translateX(0px);
          }
          50% {
            transform: translateX(100px);
          }
          100% {
            top: 110vh;
            transform: translateX(-50px);
          }
        }
        @keyframes spin {
          0% {
            transform: rotate3d(1, 1, 1, 0deg);
          }
          100% {
            transform: rotate3d(1, 1, 1, 360deg);
          }
        }
      `}</style>
    </div>
  );
};

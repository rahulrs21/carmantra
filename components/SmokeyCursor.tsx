'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  opacity: number;
  scale: number;
  velocity: { x: number; y: number };
  life: number;
}

export function SmokeyCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      
      // Add new particles
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push({
          x: e.clientX + (Math.random() - 0.5) * 20,
          y: e.clientY + (Math.random() - 0.5) * 20,
          opacity: Math.random() * 0.5 + 0.2,
          scale: Math.random() * 0.8 + 0.2,
          velocity: {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
          },
          life: 1,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;
        particle.life -= 0.02;
        particle.opacity = particle.life * 0.4;
        particle.scale += 0.02;

        if (particle.life > 0) {
          ctx.save();
          ctx.globalAlpha = particle.opacity;
          ctx.fillStyle = '#3b82f6';
          
          const size = 20 * particle.scale;
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, size
          );
          // gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
          // gradient.addColorStop(0.5, 'rgba(147, 197, 253, 0.4)');
          // gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
          
          gradient.addColorStop(0, 'rgba(255, 196, 18, 0.8)');
          gradient.addColorStop(0.5, 'rgba(245, 200, 66, 0.4)');
          gradient.addColorStop(1, 'rgba(153, 115, 2, 0)');


          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          return true;
        }
        return false;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
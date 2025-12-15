import { useEffect, useRef } from "react";

export const CarWallpaper = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let roadLines: RoadLine[] = [];
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      type: "spark" | "light" | "dust";
    }

    interface RoadLine {
      y: number;
      x: number;
      width: number;
      speed: number;
      alpha: number;
    }

    // Initialize road lines
    const initRoadLines = () => {
      roadLines = [];
      for (let i = 0; i < 20; i++) {
        roadLines.push({
          y: Math.random() * canvas.height,
          x: canvas.width * 0.3 + Math.random() * canvas.width * 0.4,
          width: 3 + Math.random() * 2,
          speed: 8 + Math.random() * 4,
          alpha: 0.3 + Math.random() * 0.4,
        });
      }
    };

    // Initialize particles
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < 100; i++) {
        particles.push(createParticle());
      }
    };

    const createParticle = (): Particle => {
      const type = Math.random() > 0.7 ? "spark" : Math.random() > 0.5 ? "light" : "dust";
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 3 + 1,
        size: type === "spark" ? 1 + Math.random() * 2 : type === "light" ? 2 + Math.random() * 4 : 1 + Math.random(),
        color: type === "spark" ? "#ff6b35" : type === "light" ? "#60a5fa" : "#64748b",
        alpha: Math.random() * 0.8 + 0.2,
        type,
      };
    };

    initRoadLines();
    initParticles();

    const drawBackground = () => {
      // Deep dark gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#0a0a12");
      gradient.addColorStop(0.3, "#0f0f1a");
      gradient.addColorStop(0.6, "#121220");
      gradient.addColorStop(1, "#0a0a12");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle city skyline silhouette
      ctx.fillStyle = "#14141f";
      const buildings = [
        { x: 0, w: 80, h: 120 },
        { x: 70, w: 50, h: 180 },
        { x: 110, w: 70, h: 100 },
        { x: 170, w: 40, h: 220 },
        { x: 200, w: 90, h: 150 },
        { x: 280, w: 60, h: 200 },
      ];

      buildings.forEach((b) => {
        const scaledX = (b.x / 340) * canvas.width;
        const scaledW = (b.w / 340) * canvas.width * 0.3;
        ctx.fillRect(scaledX, canvas.height * 0.4 - b.h * 0.3, scaledW, b.h * 0.5);
      });

      // Right side buildings
      buildings.forEach((b) => {
        const scaledX = canvas.width - ((b.x / 340) * canvas.width * 0.3) - 50;
        const scaledW = (b.w / 340) * canvas.width * 0.3;
        ctx.fillRect(scaledX, canvas.height * 0.4 - b.h * 0.3, scaledW, b.h * 0.5);
      });
    };

    const drawRoad = () => {
      // Road base - dark asphalt with perspective
      const roadGradient = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height);
      roadGradient.addColorStop(0, "#1a1a24");
      roadGradient.addColorStop(1, "#0d0d14");
      
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.3, canvas.height * 0.4);
      ctx.lineTo(canvas.width * 0.7, canvas.height * 0.4);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fillStyle = roadGradient;
      ctx.fill();

      // Road edge glow
      ctx.strokeStyle = "rgba(96, 165, 250, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.3, canvas.height * 0.4);
      ctx.lineTo(0, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.7, canvas.height * 0.4);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.stroke();
    };

    const drawRoadLines = () => {
      roadLines.forEach((line) => {
        const progress = line.y / canvas.height;
        const perspective = 0.4 + progress * 0.6;
        const centerX = canvas.width / 2;
        const lineX = centerX + (line.x - centerX) * perspective;
        const lineWidth = line.width * perspective;
        const lineHeight = 30 + progress * 60;

        ctx.fillStyle = `rgba(255, 255, 255, ${line.alpha * perspective})`;
        ctx.fillRect(lineX - lineWidth / 2, line.y, lineWidth, lineHeight);

        // Update position
        line.y += line.speed;
        if (line.y > canvas.height) {
          line.y = canvas.height * 0.4;
          line.alpha = 0.3 + Math.random() * 0.4;
        }
      });
    };

    const drawCarSilhouette = () => {
      const centerX = canvas.width / 2;
      const carY = canvas.height * 0.75;
      
      // Car glow
      const glowGradient = ctx.createRadialGradient(centerX, carY + 40, 0, centerX, carY + 40, 200);
      glowGradient.addColorStop(0, "rgba(96, 165, 250, 0.15)");
      glowGradient.addColorStop(0.5, "rgba(96, 165, 250, 0.05)");
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.fillRect(centerX - 200, carY - 50, 400, 200);

      // Headlight beams
      const beamGradient = ctx.createLinearGradient(centerX, carY, centerX, canvas.height * 0.4);
      beamGradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
      beamGradient.addColorStop(0.3, "rgba(255, 255, 255, 0.03)");
      beamGradient.addColorStop(1, "transparent");

      // Left beam
      ctx.beginPath();
      ctx.moveTo(centerX - 60, carY);
      ctx.lineTo(centerX - 150, canvas.height * 0.4);
      ctx.lineTo(centerX - 40, canvas.height * 0.4);
      ctx.lineTo(centerX - 30, carY);
      ctx.closePath();
      ctx.fillStyle = beamGradient;
      ctx.fill();

      // Right beam
      ctx.beginPath();
      ctx.moveTo(centerX + 60, carY);
      ctx.lineTo(centerX + 150, canvas.height * 0.4);
      ctx.lineTo(centerX + 40, canvas.height * 0.4);
      ctx.lineTo(centerX + 30, carY);
      ctx.closePath();
      ctx.fill();

      // Car body silhouette
      ctx.fillStyle = "#0a0a12";
      ctx.beginPath();
      ctx.moveTo(centerX - 80, carY + 30);
      ctx.lineTo(centerX - 90, carY + 10);
      ctx.lineTo(centerX - 70, carY - 20);
      ctx.lineTo(centerX - 40, carY - 35);
      ctx.lineTo(centerX + 40, carY - 35);
      ctx.lineTo(centerX + 70, carY - 20);
      ctx.lineTo(centerX + 90, carY + 10);
      ctx.lineTo(centerX + 80, carY + 30);
      ctx.closePath();
      ctx.fill();

      // Tail lights glow
      const tailGlow = ctx.createRadialGradient(centerX - 75, carY + 15, 0, centerX - 75, carY + 15, 30);
      tailGlow.addColorStop(0, "rgba(239, 68, 68, 0.8)");
      tailGlow.addColorStop(0.5, "rgba(239, 68, 68, 0.3)");
      tailGlow.addColorStop(1, "transparent");
      ctx.fillStyle = tailGlow;
      ctx.fillRect(centerX - 105, carY - 15, 60, 60);

      const tailGlow2 = ctx.createRadialGradient(centerX + 75, carY + 15, 0, centerX + 75, carY + 15, 30);
      tailGlow2.addColorStop(0, "rgba(239, 68, 68, 0.8)");
      tailGlow2.addColorStop(0.5, "rgba(239, 68, 68, 0.3)");
      tailGlow2.addColorStop(1, "transparent");
      ctx.fillStyle = tailGlow2;
      ctx.fillRect(centerX + 45, carY - 15, 60, 60);

      // Actual tail lights
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(centerX - 82, carY + 10, 15, 6);
      ctx.fillRect(centerX + 67, carY + 10, 15, 6);
    };

    const drawParticles = () => {
      particles.forEach((p, index) => {
        if (p.type === "spark") {
          // Sparks with trail
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 107, 53, ${p.alpha})`;
          ctx.fill();
          
          // Trail
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 5, p.y - p.vy * 5);
          ctx.strokeStyle = `rgba(255, 107, 53, ${p.alpha * 0.5})`;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        } else if (p.type === "light") {
          // Light orbs
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          gradient.addColorStop(0, `rgba(96, 165, 250, ${p.alpha})`);
          gradient.addColorStop(0.5, `rgba(96, 165, 250, ${p.alpha * 0.3})`);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
        } else {
          // Dust
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(100, 116, 139, ${p.alpha * 0.5})`;
          ctx.fill();
        }

        // Update particle
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.003;

        if (p.alpha <= 0 || p.y > canvas.height) {
          particles[index] = createParticle();
          particles[index].y = 0;
        }
      });
    };

    const drawSpeedLines = () => {
      const numLines = 15;
      for (let i = 0; i < numLines; i++) {
        const x = (Math.sin(time * 0.01 + i) * 0.5 + 0.5) * canvas.width;
        const startY = canvas.height * 0.5 + (i / numLines) * canvas.height * 0.3;
        const length = 50 + Math.random() * 100;
        
        const alpha = 0.1 + Math.sin(time * 0.05 + i) * 0.05;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + length);
        ctx.stroke();
      }
    };

    const drawAmbientGlow = () => {
      // Top ambient glow
      const topGlow = ctx.createRadialGradient(
        canvas.width / 2, 
        canvas.height * 0.3, 
        0, 
        canvas.width / 2, 
        canvas.height * 0.3, 
        canvas.width * 0.5
      );
      topGlow.addColorStop(0, "rgba(59, 130, 246, 0.05)");
      topGlow.addColorStop(0.5, "rgba(139, 92, 246, 0.02)");
      topGlow.addColorStop(1, "transparent");
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);

      // Pulsing ambient
      const pulse = Math.sin(time * 0.02) * 0.02 + 0.03;
      const ambientGlow = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height,
        0,
        canvas.width / 2,
        canvas.height,
        canvas.width * 0.8
      );
      ambientGlow.addColorStop(0, `rgba(96, 165, 250, ${pulse})`);
      ambientGlow.addColorStop(0.5, `rgba(139, 92, 246, ${pulse * 0.5})`);
      ambientGlow.addColorStop(1, "transparent");
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, canvas.height * 0.4, canvas.width, canvas.height * 0.6);
    };

    const animate = () => {
      time++;
      
      drawBackground();
      drawAmbientGlow();
      drawRoad();
      drawRoadLines();
      drawSpeedLines();
      drawCarSilhouette();
      drawParticles();

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: "#0a0a12" }}
    />
  );
};


import { COLORS, CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';
import { Particle, Obstacle } from '../types';

// Helper to draw the Skyline (Procedural or Generated)
export const drawSkyline = (ctx: CanvasRenderingContext2D, scrollX: number, layer: number, bgImage?: HTMLImageElement | null) => {
  const parallaxFactor = 0.2 + (layer * 0.15); // Layer 0 is furthest
  const offset = (scrollX * parallaxFactor);
  
  ctx.save();
  
  // If we have a generated background image, we use it for the main background layer
  // We only draw it on layer 0 to avoid clutter, or we could draw it on all layers with different opacity
  if (bgImage && layer === 0) {
      const imgWidth = bgImage.width;
      const imgHeight = bgImage.height;
      
      // Scale image to fit height while maintaining aspect ratio, but ensure it covers width
      // Actually, for a game background, we often want to cover the height
      const scale = CANVAS_HEIGHT / imgHeight;
      const scaledWidth = imgWidth * scale;
      
      // Calculate loop
      const relativeX = offset % scaledWidth;
      
      // Draw twice for seamless loop
      ctx.drawImage(bgImage, -relativeX, 0, scaledWidth, CANVAS_HEIGHT);
      ctx.drawImage(bgImage, -relativeX + scaledWidth, 0, scaledWidth, CANVAS_HEIGHT);
      // Draw a third time to prevent gaps on wide screens or fast scrolls
      if (-relativeX + scaledWidth < CANVAS_WIDTH) {
         ctx.drawImage(bgImage, -relativeX + (scaledWidth * 2), 0, scaledWidth, CANVAS_HEIGHT);
      }
      
      // Add a dark overlay to ensure gameplay visibility
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.restore();
      return;
  }
  
  // If we have an image, we skip the procedural layers 1 and 2 to keep the style of the generated image clean
  if (bgImage) {
      ctx.restore();
      return;
  }

  // --- Fallback: Procedural Edinburgh Skyline ---

  ctx.fillStyle = layer === 0 ? '#0a0a0f' : layer === 1 ? '#11111a' : '#1a1a25';
  
  // We draw the shape twice to loop it seamlessly
  for (let i = 0; i < 2; i++) {
    const startX = (i * CANVAS_WIDTH) - (offset % CANVAS_WIDTH);
    
    ctx.beginPath();
    ctx.moveTo(startX, CANVAS_HEIGHT);
    
    // Procedural "Buildings" based on sine waves and noise to look like a skyline
    // Using a seeded-like approach for consistency based on x coordinate
    let x = 0;
    while (x < CANVAS_WIDTH) {
        // Different building styles based on layer
        const seed = (x + (layer * 1000));
        const heightBase = layer === 0 ? 300 : layer === 1 ? 200 : 100;
        const heightVar = Math.sin(seed * 0.05) * 50 + Math.cos(seed * 0.02) * 30;
        const buildingWidth = 40 + (Math.sin(seed * 0.1) * 20); // 20-60px wide
        
        const currentHeight = heightBase + heightVar;
        const y = CANVAS_HEIGHT - currentHeight;

        // Draw roof type (flat, pointed, castle-like)
        const roofType = Math.floor(Math.abs(Math.sin(seed)) * 3);
        
        if (roofType === 0) { // Flat tenement
             ctx.lineTo(startX + x, y);
             ctx.lineTo(startX + x + buildingWidth, y);
        } else if (roofType === 1) { // Spire
             ctx.lineTo(startX + x, y);
             ctx.lineTo(startX + x + buildingWidth/2, y - 40); // Point
             ctx.lineTo(startX + x + buildingWidth, y);
        } else { // Battlements
             ctx.lineTo(startX + x, y);
             ctx.lineTo(startX + x + buildingWidth * 0.25, y);
             ctx.lineTo(startX + x + buildingWidth * 0.25, y + 10);
             ctx.lineTo(startX + x + buildingWidth * 0.5, y + 10);
             ctx.lineTo(startX + x + buildingWidth * 0.5, y);
             ctx.lineTo(startX + x + buildingWidth * 0.75, y);
             ctx.lineTo(startX + x + buildingWidth * 0.75, y + 10);
             ctx.lineTo(startX + x + buildingWidth, y + 10);
             ctx.lineTo(startX + x + buildingWidth, y);
        }
        
        x += buildingWidth;
    }
    
    ctx.lineTo(startX + CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fill();

    // Windows (Glow effect)
    if (layer > 0) {
        ctx.fillStyle = `rgba(255, 200, 100, ${0.1 + (layer * 0.05)})`;
        // Simple windows loop
        let winX = 20;
        while(winX < CANVAS_WIDTH) {
             if (Math.random() > 0.6) {
                 const h = 100 + Math.random() * 100;
                 ctx.fillRect(startX + winX, CANVAS_HEIGHT - h, 4, 8);
                 ctx.fillRect(startX + winX + 10, CANVAS_HEIGHT - h, 4, 8);
             }
             winX += 50;
        }
        // Reset fill for next iteration main shape
        ctx.fillStyle = layer === 0 ? '#0a0a0f' : layer === 1 ? '#11111a' : '#1a1a25';
    }
  }
  ctx.restore();
};

export const drawCobblestones = (ctx: CanvasRenderingContext2D, scrollX: number, y: number) => {
    const patternWidth = 100;
    const offset = scrollX % patternWidth;
    
    ctx.save();
    ctx.fillStyle = '#0f0f15'; // Dark road base
    ctx.fillRect(0, y, CANVAS_WIDTH, CANVAS_HEIGHT - y);

    ctx.strokeStyle = '#2a2a35';
    ctx.lineWidth = 2;
    
    // Moving horizontal lines
    for (let i = 0; i < CANVAS_WIDTH + patternWidth; i += 60) {
        const drawX = i - offset;
        for (let j = 0; j < (CANVAS_HEIGHT - y); j+= 30) {
            if (Math.random() > 0.5) {
                ctx.strokeRect(drawX, y + j, 55, 25);
            }
        }
    }
    
    // Top highlight line (Neon curb)
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.neonBlue;
    ctx.strokeStyle = COLORS.neonBlue;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    ctx.restore();
};

export const drawRain = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(174, 194, 224, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const rainCount = 100;
    for (let i = 0; i < rainCount; i++) {
        // Pseudo-random positions based on time to make them fall
        const x = (Math.sin(i * 132.1) * width + time * 100) % width;
        const speed = 15 + Math.sin(i) * 5;
        const y = (Math.cos(i * 43.2) * height + time * speed * 20) % height;
        const len = 20 + Math.random() * 20;
        
        ctx.moveTo(x, y);
        ctx.lineTo(x - 5, y + len); // Slanted rain
    }
    ctx.stroke();
    ctx.restore();
};

export const drawPlayer = (ctx: CanvasRenderingContext2D, player: any) => {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate((player.rotation * Math.PI) / 180);
    
    const size = player.width;
    const half = size / 2;

    // RGB Split Effect for "Intense" visual
    const offsets = [{c: 'red', x: -2, y: 0}, {c: 'blue', x: 2, y: 0}, {c: 'lime', x: 0, y: 2}];
    
    ctx.globalCompositeOperation = 'screen';
    offsets.forEach(off => {
        ctx.strokeStyle = off.c;
        ctx.lineWidth = 2;
        ctx.strokeRect(-half + off.x, -half + off.y, size, size);
    });
    ctx.globalCompositeOperation = 'source-over';

    // Glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.color;
    
    // Body (Black Center)
    ctx.fillStyle = '#000';
    ctx.fillRect(-half, -half, size, size);
    
    // Main Neon Outline
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(-half, -half, size, size);
    
    // Inner Face Design
    ctx.fillStyle = player.color;
    ctx.fillRect(-size * 0.25, -size * 0.25, size * 0.5, size * 0.5);
    
    // Corner accents
    const cornerSize = 4;
    ctx.fillRect(-half, -half, cornerSize, cornerSize);
    ctx.fillRect(half - cornerSize, -half, cornerSize, cornerSize);
    ctx.fillRect(-half, half - cornerSize, cornerSize, cornerSize);
    ctx.fillRect(half - cornerSize, half - cornerSize, cornerSize, cornerSize);

    ctx.restore();
};

export const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
};

export const drawDrone = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string, enemyImage?: HTMLImageElement | null) => {
    ctx.save();
    ctx.translate(x + width/2, y + height/2);
    
    if (enemyImage) {
        // Use the generated enemy sprite
        // We use 'screen' composite mode because generated sprites on black backgrounds look great this way in a neon game
        ctx.globalCompositeOperation = 'screen';
        const scale = 1.5; // Make sprites slightly larger than hitboxes for visual flair
        ctx.drawImage(enemyImage, -width * scale / 2, -height * scale / 2, width * scale, height * scale);
        
        // Add a pulse glow behind it
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, width/2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Procedural Drone
        
        // Core
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, 0, width/3, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing Eye
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, width/6, 0, Math.PI * 2);
        ctx.fill();
        
        // Rotating Rings
        const time = Date.now() * 0.005;
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        
        // Ring 1
        ctx.beginPath();
        ctx.ellipse(0, 0, width/2, height/4, time, 0, Math.PI * 2);
        ctx.stroke();

        // Ring 2
        ctx.beginPath();
        ctx.ellipse(0, 0, width/2, height/4, -time, 0, Math.PI * 2);
        ctx.stroke();

        // Scanner beam (Triangle)
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-20, 40);
        ctx.lineTo(20, 40);
        ctx.fill();
    }
    
    ctx.restore();
};

export const draw3DObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, scrollX: number, obstacleImage?: HTMLImageElement | null) => {
    const screenX = obs.x - scrollX;
    
    if (obs.type === 'DRONE') {
        // drawDrone is called separately usually or we can route here
        // But the main loop routes types. Let's assume logic routes correctly.
        return;
    }
    
    ctx.save();
    
    if (obs.type === 'SPIKE') {
        const w = obs.width;
        const h = obs.height;
        const bX = screenX;
        const bY = obs.y + h;
        
        // 3D Shadow/Side (Darker)
        ctx.fillStyle = '#300';
        ctx.beginPath();
        ctx.moveTo(bX + w, bY);
        ctx.lineTo(bX + w + 10, bY - 10);
        ctx.lineTo(bX + w/2 + 10, obs.y - 10);
        ctx.lineTo(bX + w/2, obs.y);
        ctx.closePath();
        ctx.fill();

        // Main Triangle
        ctx.beginPath();
        ctx.moveTo(bX, bY); // bottom left
        ctx.lineTo(bX + w / 2, obs.y); // top mid
        ctx.lineTo(bX + w, bY); // bottom right
        ctx.closePath();
        
        ctx.fillStyle = '#000';
        ctx.fill();
        
        ctx.shadowColor = COLORS.spike;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = COLORS.spike;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner gradient
        const grad = ctx.createLinearGradient(bX, obs.y, bX, bY);
        grad.addColorStop(0, COLORS.spike);
        grad.addColorStop(1, '#300');
        ctx.fillStyle = grad;
        ctx.fill();
        
    } else if (obs.type === 'BLOCK' || obs.type === 'PLATFORM') {
        
        // If we have a generated obstacle sprite and it is a BLOCK
        if (obstacleImage && obs.type === 'BLOCK') {
            ctx.globalCompositeOperation = 'screen';
            // Draw slightly larger to cover the box
            ctx.drawImage(obstacleImage, screenX - 5, obs.y - 5, obs.width + 10, obs.height + 10);
            
            // Add a simple bounding box for clarity
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, obs.y, obs.width, obs.height);
            ctx.restore();
            return;
        }

        // --- Procedural Fallback ---
        const depth = 20;
        const isPlatform = obs.type === 'PLATFORM';
        const blockColor = isPlatform ? '#2a2a35' : '#1a1a1a';
        
        // 3D Extrusion
        // Top Face
        ctx.fillStyle = blockColor; // Slightly lighter than side
        ctx.beginPath();
        ctx.moveTo(screenX, obs.y);
        ctx.lineTo(screenX + depth, obs.y - depth);
        ctx.lineTo(screenX + obs.width + depth, obs.y - depth);
        ctx.lineTo(screenX + obs.width, obs.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (isPlatform) {
             // Glowing rail on top
             ctx.strokeStyle = COLORS.neonBlue;
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.moveTo(screenX, obs.y);
             ctx.lineTo(screenX + obs.width, obs.y);
             ctx.stroke();
        }

        // Side Face (Right)
        ctx.fillStyle = '#0f0f0f'; // Darkest
        ctx.beginPath();
        ctx.moveTo(screenX + obs.width, obs.y);
        ctx.lineTo(screenX + obs.width + depth, obs.y - depth);
        ctx.lineTo(screenX + obs.width + depth, obs.y + obs.height - depth);
        ctx.lineTo(screenX + obs.width, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Front Face
        ctx.fillStyle = isPlatform ? '#151520' : '#111';
        ctx.fillRect(screenX, obs.y, obs.width, obs.height);
        
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, obs.y, obs.width, obs.height);
        
        // Tech detail
        ctx.beginPath();
        ctx.strokeStyle = isPlatform ? '#334' : '#222';
        ctx.moveTo(screenX, obs.y);
        ctx.lineTo(screenX + obs.width, obs.y + obs.height);
        ctx.moveTo(screenX + obs.width, obs.y);
        ctx.lineTo(screenX, obs.y + obs.height);
        ctx.stroke();
        
        if (isPlatform) {
            // Thrusters at bottom
            ctx.fillStyle = COLORS.neonBlue;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(screenX + 10, obs.y + obs.height, 10, 5);
            ctx.fillRect(screenX + obs.width - 20, obs.y + obs.height, 10, 5);
            ctx.globalAlpha = 1.0;
        }
    }
    
    ctx.restore();
};

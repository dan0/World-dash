
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, Player, Obstacle, Particle } from '../types';
import { 
    CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, GRAVITY, JUMP_FORCE, 
    INITIAL_SPEED, GROUND_HEIGHT, ROTATION_SPEED, MAX_SPEED 
} from '../constants';
import { drawSkyline, drawCobblestones, drawPlayer, drawRain, drawParticles, draw3DObstacle, drawDrone } from '../utils/drawingUtils';
import { AudioManager } from '../utils/audioManager';

interface GameCanvasProps {
    gameState: GameState;
    setGameState: (state: GameState) => void;
    setScore: (score: number) => void;
    bgImage: HTMLImageElement | null;
    enemyImage: HTMLImageElement | null;
    obstacleImage: HTMLImageElement | null;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, setScore, bgImage, enemyImage, obstacleImage }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const frameCountRef = useRef(0);
    const scoreRef = useRef(0);
    const audioManagerRef = useRef<AudioManager | null>(null);
    
    // Game State Mutable Refs
    const playerRef = useRef<Player>({
        x: 200,
        y: CANVAS_HEIGHT - GROUND_HEIGHT - 50,
        width: 50,
        height: 50,
        dy: 0,
        jumpCount: 0,
        rotation: 0,
        isDead: false,
        color: COLORS.neonGold,
        isJumping: false,
        isGrounded: true
    });
    
    const obstaclesRef = useRef<Obstacle[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const scrollRef = useRef(0);
    const speedRef = useRef(INITIAL_SPEED);
    const shakeRef = useRef(0);

    // Initialize Audio Manager once
    useEffect(() => {
        audioManagerRef.current = new AudioManager();
        return () => {
            audioManagerRef.current?.stop();
        };
    }, []);

    const spawnObstacle = useCallback((lastX: number) => {
        const typeRoll = Math.random();
        const minGap = 400; // Minimum distance between obstacles
        const gap = minGap + Math.random() * 400; // Random gap
        const x = lastX + gap;
        
        if (typeRoll > 0.8) {
             // Moving Drone (Enemy)
             const droneY = CANVAS_HEIGHT - GROUND_HEIGHT - 100 - (Math.random() * 100);
             obstaclesRef.current.push({
                x,
                y: droneY,
                initialY: droneY,
                width: 40,
                height: 40,
                type: 'DRONE',
                oscillateSpeed: 0.05 + Math.random() * 0.05,
                oscillateRange: 50 + Math.random() * 50
            });
        } else if (typeRoll > 0.6) {
             // Moving Platform
             const platY = CANVAS_HEIGHT - GROUND_HEIGHT - 80 - (Math.random() * 60);
             obstaclesRef.current.push({
                x,
                y: platY,
                initialY: platY,
                width: 100,
                height: 30,
                type: 'PLATFORM',
                oscillateSpeed: 0.02,
                oscillateRange: 30
            });
        } else if (typeRoll > 0.35) {
            // Block
            const height = 60 + Math.random() * 60;
            obstaclesRef.current.push({
                x,
                y: CANVAS_HEIGHT - GROUND_HEIGHT - height,
                width: 50,
                height: height,
                type: 'BLOCK'
            });
        } else {
            // Spike(s)
            const count = Math.floor(Math.random() * 2) + 1; // 1 or 2 spikes
            for(let i=0; i<count; i++) {
                obstaclesRef.current.push({
                    x: x + (i * 40),
                    y: CANVAS_HEIGHT - GROUND_HEIGHT - 40,
                    width: 40,
                    height: 40,
                    type: 'SPIKE'
                });
            }
        }
    }, []);

    const resetGame = useCallback(() => {
        playerRef.current = {
            x: 200,
            y: CANVAS_HEIGHT - GROUND_HEIGHT - 50,
            width: 50,
            height: 50,
            dy: 0,
            jumpCount: 0,
            rotation: 0,
            isDead: false,
            color: COLORS.neonGold,
            isJumping: false,
            isGrounded: true
        };
        obstaclesRef.current = [];
        particlesRef.current = [];
        scrollRef.current = 0;
        speedRef.current = INITIAL_SPEED;
        scoreRef.current = 0;
        shakeRef.current = 0;
        setScore(0);
        
        let lastX = CANVAS_WIDTH;
        for (let i = 0; i < 5; i++) {
            spawnObstacle(lastX);
            lastX = obstaclesRef.current[obstaclesRef.current.length-1].x;
        }
    }, [setScore, spawnObstacle]);

    const createExplosion = (x: number, y: number, color: string) => {
        for (let i = 0; i < 30; i++) {
            particlesRef.current.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1.0,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    };

    const jump = useCallback(() => {
        const player = playerRef.current;
        // Only jump if grounded
        if (player.isGrounded && !player.isDead) {
            player.dy = JUMP_FORCE;
            player.isJumping = true;
            player.isGrounded = false;
            
            audioManagerRef.current?.playJumpSound();

            // Create jump particles
            for(let i=0; i<8; i++) {
                particlesRef.current.push({
                    x: player.x + player.width/2,
                    y: player.y + player.height,
                    vx: (Math.random() - 0.5) * 6,
                    vy: Math.random() * 3,
                    life: 0.8,
                    color: '#fff',
                    size: 2
                });
            }
        }
    }, []);

    const update = useCallback(() => {
        if (gameState !== GameState.PLAYING) return;

        const player = playerRef.current;
        let isGroundedThisFrame = false;
        
        // 1. Physics (Vertical)
        player.dy += GRAVITY;
        player.y += player.dy;
        
        // 2. Scroll (Horizontal)
        scrollRef.current += speedRef.current;
        scoreRef.current = Math.floor(scrollRef.current / 100);
        setScore(scoreRef.current);
        
        if (speedRef.current < MAX_SPEED) {
            speedRef.current += 0.002;
        }

        // 3. Ground Collision
        const floorY = CANVAS_HEIGHT - GROUND_HEIGHT - player.height;
        if (player.y >= floorY) {
            player.y = floorY;
            player.dy = 0;
            isGroundedThisFrame = true;
        }

        // 4. Obstacles
        // Cleanup old obstacles
        if (obstaclesRef.current.length > 0 && obstaclesRef.current[0].x + obstaclesRef.current[0].width < scrollRef.current - 200) {
             obstaclesRef.current.shift();
        }

        // Spawn new obstacles
        const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
        if (!lastObstacle || (lastObstacle.x - scrollRef.current) < CANVAS_WIDTH) {
             spawnObstacle(lastObstacle ? lastObstacle.x : CANVAS_WIDTH + scrollRef.current);
        }

        // Update Moving Obstacles & Calculate Danger Level
        let minDistanceToDanger = 2000; // Arbitrary large number

        obstaclesRef.current.forEach(obs => {
            if (obs.oscillateSpeed && obs.initialY !== undefined && obs.oscillateRange) {
                obs.y = obs.initialY + Math.sin(frameCountRef.current * obs.oscillateSpeed) * obs.oscillateRange;
            }

            // Calculate distance to this obstacle
            const dist = (obs.x - scrollRef.current) - player.x;
            if (dist > 0 && dist < minDistanceToDanger) {
                minDistanceToDanger = dist;
            }
        });

        // Update Audio Intensity based on proximity to danger
        // Danger zone is roughly 0 to 600 pixels away. 
        // We map 600px -> 0 intensity, 0px -> 1 intensity
        const dangerZone = 600;
        const rawIntensity = Math.max(0, 1 - (minDistanceToDanger / dangerZone));
        audioManagerRef.current?.setIntensity(rawIntensity);

        // Collision Checks
        const playerRect = {
            l: player.x + 8, 
            r: player.x + player.width - 8,
            t: player.y + 8,
            b: player.y + player.height - 8
        };

        for (const obs of obstaclesRef.current) {
            const obsScreenX = obs.x - scrollRef.current;
            const obsRect = {
                l: obsScreenX + 5,
                r: obsScreenX + obs.width - 5,
                t: obs.y + 5,
                b: obs.y + obs.height - 5
            };

            // Simple AABB Collision
            if (playerRect.l < obsRect.r && playerRect.r > obsRect.l &&
                playerRect.t < obsRect.b && playerRect.b > obsRect.t) {
                
                // Logic based on type
                if (obs.type === 'SPIKE' || obs.type === 'DRONE') {
                    // Death
                    player.isDead = true;
                    createExplosion(player.x + player.width/2, player.y + player.height/2, player.color);
                    shakeRef.current = 25;
                    audioManagerRef.current?.playExplosion();
                    setGameState(GameState.GAME_OVER);
                    return; 
                } else if (obs.type === 'BLOCK' || obs.type === 'PLATFORM') {
                     // Block/Platform landing logic
                    const prevY = player.y - player.dy;
                    // Tolerance for landing on moving platforms
                    const landingTolerance = obs.type === 'PLATFORM' ? 20 : 15;
                    
                    // If we were above the block in previous frame and are falling down
                    if (prevY + player.height <= obs.y + landingTolerance && player.dy >= 0) {
                        player.y = obs.y - player.height;
                        player.dy = 0;
                        isGroundedThisFrame = true;
                    } else {
                        // CRASH (Hit side or bottom)
                        player.isDead = true;
                        createExplosion(player.x + player.width/2, player.y + player.height/2, player.color);
                        shakeRef.current = 25;
                        audioManagerRef.current?.playExplosion();
                        setGameState(GameState.GAME_OVER);
                        return;
                    }
                }
            }
        }
        
        player.isGrounded = isGroundedThisFrame;

        // 5. Rotation Logic
        if (player.isGrounded) {
            player.isJumping = false;
            // Snap to nearest 90 degrees to ensure flat landing
            const nearest90 = Math.round(player.rotation / 90) * 90;
            // Smoothly interpolate to flat
            const diff = nearest90 - player.rotation;
            if (Math.abs(diff) > 0.5) {
                player.rotation += diff * 0.4;
            } else {
                player.rotation = nearest90;
            }
        } else {
            // Only rotate if we initiated a jump. Falling off ledges keeps angle flat.
            if (player.isJumping) {
                player.rotation += ROTATION_SPEED;
            }
        }

        // 6. Particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }

        if (shakeRef.current > 0) shakeRef.current *= 0.9;
        if (shakeRef.current < 0.5) shakeRef.current = 0;

    }, [gameState, setGameState, setScore, spawnObstacle]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Apply Camera Shake
        ctx.save();
        if (shakeRef.current > 0) {
            const dx = (Math.random() - 0.5) * shakeRef.current;
            const dy = (Math.random() - 0.5) * shakeRef.current;
            ctx.translate(dx, dy);
        }

        // 1. Background
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, COLORS.skyTop);
        gradient.addColorStop(1, COLORS.skyBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. Parallax (Passing bgImage)
        drawSkyline(ctx, scrollRef.current, 0, bgImage); 
        drawSkyline(ctx, scrollRef.current, 1, bgImage); 
        drawSkyline(ctx, scrollRef.current, 2, bgImage); 

        // 3. Ground
        const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;
        drawCobblestones(ctx, scrollRef.current, groundY);

        // 4. Obstacles (3D or Sprites)
        obstaclesRef.current.forEach(obs => {
            const screenX = obs.x - scrollRef.current;
            if (screenX > -200 && screenX < CANVAS_WIDTH + 200) {
                if (obs.type === 'DRONE') {
                    drawDrone(ctx, screenX, obs.y, obs.width, obs.height, COLORS.drone, enemyImage);
                } else {
                    draw3DObstacle(ctx, obs, scrollRef.current, obstacleImage);
                }
            }
        });

        // 5. Player
        if (!playerRef.current.isDead) {
            drawPlayer(ctx, playerRef.current);
        }

        // 6. Particles
        drawParticles(ctx, particlesRef.current);

        // 7. Rain
        drawRain(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, frameCountRef.current * 0.05);

        ctx.restore(); 

        frameCountRef.current++;
    }, [bgImage, enemyImage, obstacleImage]);

    const loop = useCallback(() => {
        update();
        draw();
        requestRef.current = requestAnimationFrame(loop);
    }, [update, draw]);

    useEffect(() => {
        if (gameState === GameState.MENU) {
            resetGame(); 
            draw();
            audioManagerRef.current?.stop();
        } else if (gameState === GameState.PLAYING) {
            // Check if player needs reset (e.g., coming from GAME_OVER)
            if (playerRef.current.isDead) {
                resetGame();
            }
            audioManagerRef.current?.start();
            requestRef.current = requestAnimationFrame(loop);
        } else if (gameState === GameState.GAME_OVER) {
            draw(); 
            audioManagerRef.current?.stop();
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [gameState, loop, draw, resetGame]);

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.code === 'Space' || e.code === 'ArrowUp') && gameState === GameState.PLAYING) {
                jump();
                e.preventDefault(); 
            }
        };
        
        const handleTouch = (e: TouchEvent) => {
             if (gameState === GameState.PLAYING) {
                jump();
                 e.preventDefault();
             }
        };
        
        const handleClick = () => {
             if (gameState === GameState.PLAYING) {
                jump();
             }
        }

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('touchstart', handleTouch, { passive: false });
        window.addEventListener('mousedown', handleClick); 

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('touchstart', handleTouch);
            window.removeEventListener('mousedown', handleClick);
        };
    }, [gameState, jump]);

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full object-contain bg-black shadow-2xl"
        />
    );
};

export default GameCanvas;

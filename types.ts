export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  PAUSED = 'PAUSED',
  GENERATING = 'GENERATING'
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
  jumpCount: number;
  rotation: number;
  isDead: boolean;
  color: string;
  isJumping: boolean;
  isGrounded: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'SPIKE' | 'BLOCK' | 'PLATFORM' | 'DRONE';
  initialY?: number;
  oscillateSpeed?: number;
  oscillateRange?: number;
  oscillateOffset?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface GameConfig {
  gravity: number;
  jumpForce: number;
  speed: number;
  groundHeight: number;
}


import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './types';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [location, setLocation] = useState('Edinburgh');
  
  // Generated Assets
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [enemyImage, setEnemyImage] = useState<HTMLImageElement | null>(null);
  const [obstacleImage, setObstacleImage] = useState<HTMLImageElement | null>(null);
  
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleStartDefault = () => {
      setBgImage(null);
      setEnemyImage(null);
      setObstacleImage(null);
      setGameState(GameState.PLAYING);
  };

  const loadImage = (base64: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = `data:image/png;base64,${base64}`;
      });
  };

  const generateWorldAndPlay = async () => {
    // 1. Handle API Key Check/Selection logic for GenAI features
    if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try {
                await (window as any).aistudio.openSelectKey();
            } catch (e) {
                console.error(e);
            }
        }
        // Re-check if key is now available
        const hasKeyAfter = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKeyAfter) {
             setGenerationError("API Key required for custom generation.");
             return;
        }
    }

    setGameState(GameState.GENERATING);
    setGenerationError(null);

    try {
        // Create new instance to ensure key is fresh
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-3-pro-image-preview';
        
        const bgPrompt = `Panoramic side-scrolling game background of ${location}, neon cyberpunk noir style, seamless loop, high detail, 2d game art, wide shot.`;
        const enemyPrompt = `Single sprite of a flying enemy or drone themed around ${location}, cyberpunk neon style, isolated on solid black background, side view, high contrast.`;
        const obstaclePrompt = `Single sprite of a street obstacle, crate or barrier themed around ${location}, cyberpunk neon style, isolated on solid black background, high contrast.`;

        // Parallel Requests
        const [bgRes, enemyRes, obsRes] = await Promise.all([
            ai.models.generateContent({
                model,
                contents: { parts: [{ text: bgPrompt }] },
                config: { imageConfig: { aspectRatio: "16:9", imageSize: "2K" } }
            }),
            ai.models.generateContent({
                model,
                contents: { parts: [{ text: enemyPrompt }] },
                config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
            }),
            ai.models.generateContent({
                model,
                contents: { parts: [{ text: obstaclePrompt }] },
                config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
            })
        ]);

        const extractImage = (response: any) => {
            const candidates = response.candidates;
            if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
                for (const part of candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        return part.inlineData.data;
                    }
                }
            }
            return null;
        };

        const bgB64 = extractImage(bgRes);
        const enemyB64 = extractImage(enemyRes);
        const obsB64 = extractImage(obsRes);

        if (bgB64) {
            const bg = await loadImage(bgB64);
            setBgImage(bg);
        }
        
        if (enemyB64) {
            const en = await loadImage(enemyB64);
            setEnemyImage(en);
        }
        
        if (obsB64) {
            const obs = await loadImage(obsB64);
            setObstacleImage(obs);
        }

        setGameState(GameState.PLAYING);

    } catch (e: any) {
        console.error("Generation failed:", e);
        setGenerationError(e.message || "Failed to generate world. Try again.");
        setGameState(GameState.MENU);
    }
  };

  return (
    <div className="relative w-screen h-screen flex justify-center items-center bg-zinc-900 overflow-hidden select-none">
      
      {/* Visual Filters */}
      <div className="scanlines absolute inset-0 z-10 w-full h-full pointer-events-none"></div>
      <div className="vignette absolute inset-0 z-20 w-full h-full pointer-events-none"></div>

      {/* Game Container */}
      <div className="relative z-0 aspect-video w-full max-w-7xl border-4 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black">
        <GameCanvas 
            gameState={gameState} 
            setGameState={setGameState} 
            setScore={setScore}
            bgImage={bgImage}
            enemyImage={enemyImage}
            obstacleImage={obstacleImage}
        />

        {/* HUD - Score */}
        {gameState === GameState.PLAYING && (
            <div className="absolute top-6 right-8 text-4xl font-bold tracking-widest text-white z-30 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)] font-[Orbitron]">
                {score.toString().padStart(6, '0')}
            </div>
        )}

        {/* MENU OVERLAY */}
        {gameState === GameState.MENU && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/85 backdrop-blur-sm p-8">
                <h1 className="text-5xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-purple-600 font-black mb-8 drop-shadow-[0_0_25px_rgba(0,243,255,0.5)] gothic-font text-center">
                    NEON RUNNER
                </h1>
                
                <div className="w-full max-w-md space-y-8">
                    
                    {/* Standard Play */}
                    <button 
                        onClick={handleStartDefault}
                        className="group relative w-full px-8 py-4 bg-zinc-800 hover:bg-zinc-700 transition-all border border-zinc-600 hover:border-cyan-500"
                    >
                         <span className="text-xl font-bold text-white tracking-widest uppercase group-hover:text-cyan-400 transition-colors">
                            Play Standard Run
                        </span>
                        <div className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Procedural Edinburgh</div>
                    </button>

                    <div className="relative flex items-center justify-center">
                        <div className="border-t border-zinc-700 w-full"></div>
                        <span className="absolute bg-black px-4 text-xs text-zinc-500 uppercase tracking-widest">Or Create World</span>
                    </div>

                    {/* Custom Generation */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-cyan-400 text-xs uppercase tracking-widest font-bold">Target Location</label>
                            <input 
                                type="text" 
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-zinc-900 border-2 border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors font-[Orbitron] text-lg placeholder-zinc-600"
                                placeholder="e.g. Tokyo, Mars, Atlantis"
                            />
                        </div>

                        <button 
                            onClick={generateWorldAndPlay}
                            className="group relative w-full px-12 py-4 bg-transparent overflow-hidden"
                        >
                            <div className="absolute inset-0 w-3 bg-purple-600 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>
                            <div className="absolute inset-0 border-2 border-purple-500 blur-[2px] opacity-70"></div>
                            <div className="absolute inset-0 border-2 border-purple-500"></div>
                            <span className="relative text-lg font-bold text-purple-400 group-hover:text-white transition-colors tracking-widest uppercase">
                                Generate & Play
                            </span>
                        </button>
                    </div>

                    {generationError && (
                        <div className="text-red-400 text-center text-xs bg-red-900/20 p-3 border border-red-500/30 uppercase tracking-wider">
                            {generationError}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* LOADING / GENERATING OVERLAY */}
        {gameState === GameState.GENERATING && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black">
                 <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-8"></div>
                 <h2 className="text-2xl text-cyan-400 animate-pulse tracking-widest uppercase">
                    Constructing World...
                 </h2>
                 <p className="text-zinc-500 text-sm mt-2">Generating Background, Enemies & Obstacles for {location}...</p>
            </div>
        )}

        {/* GAME OVER OVERLAY */}
        {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-red-900/20 backdrop-blur-md">
                 <h2 className="text-7xl text-red-500 font-black mb-4 drop-shadow-[0_0_30px_rgba(255,0,0,0.8)] tracking-tighter">
                    TERMINATED
                </h2>
                <div className="text-4xl text-white font-bold mb-8 font-[Orbitron]">
                    SCORE: {score}
                </div>
                
                <div className="flex gap-6">
                    <button 
                        onClick={() => setGameState(GameState.MENU)}
                        className="px-8 py-3 border border-white/20 text-white/70 hover:bg-white/10 hover:text-white transition-all uppercase tracking-wider"
                    >
                        Main Menu
                    </button>
                    <button 
                        onClick={() => setGameState(GameState.PLAYING)}
                        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all uppercase tracking-wider"
                    >
                        Retry Run
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Footer / Aesthetic Elements */}
      <div className="absolute bottom-4 left-6 text-xs text-white/30 uppercase tracking-[0.2em] font-light">
          System: Online &bull; Loc: {bgImage ? location : 'Edinburgh (Default)'} &bull; Mode: Dark
      </div>
    </div>
  );
};

export default App;

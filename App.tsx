import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './types';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [location, setLocation] = useState('Edinburgh');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if ((window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  };

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      // Assume success and re-check, or just set true
      setHasApiKey(true);
    }
  };

  const generateWorldAndPlay = async () => {
    if (!hasApiKey) {
      await handleSelectKey();
    }
    
    // Check again
    if (!process.env.API_KEY) {
        // Fallback if environment variable isn't immediately available, though in this environment it should be injected.
        // We will proceed. If it fails, we catch the error.
    }

    setGameState(GameState.GENERATING);
    setGenerationError(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-3-pro-image-preview';
        const prompt = `A dark, moody, intense neon-gothic 2d game parallax background of ${location}. Cyberpunk style, night time, high contrast. Wide view suitable for side scroller.`;
        
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "2K"
                }
            }
        });

        let base64Image = null;
        
        // Extract image from response
        const candidates = response.candidates;
        if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    base64Image = part.inlineData.data;
                    break;
                }
            }
        }

        if (base64Image) {
            const img = new Image();
            img.src = `data:image/png;base64,${base64Image}`;
            img.onload = () => {
                setBgImage(img);
                setGameState(GameState.PLAYING);
            };
            img.onerror = () => {
                setGenerationError("Failed to load generated image asset.");
                setGameState(GameState.MENU);
            };
        } else {
            // No image found, fallback to default Edinburgh but maybe show a warning?
            console.warn("No image generated, falling back to procedural assets.");
            setGameState(GameState.PLAYING);
        }

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
        />

        {/* HUD - Score */}
        {gameState === GameState.PLAYING && (
            <div className="absolute top-6 right-8 text-4xl font-bold tracking-widest text-white z-30 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)] font-[Orbitron]">
                {score.toString().padStart(6, '0')}
            </div>
        )}

        {/* MENU OVERLAY */}
        {gameState === GameState.MENU && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/80 backdrop-blur-sm p-8">
                <h1 className="text-5xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-purple-600 font-black mb-4 drop-shadow-[0_0_25px_rgba(0,243,255,0.5)] gothic-font text-center">
                    NEON RUNNER
                </h1>
                
                <div className="w-full max-w-md space-y-6">
                    {!hasApiKey ? (
                        <div className="text-center space-y-4">
                             <p className="text-gray-300 text-sm">
                                To generate custom worlds, please select a paid API Key.
                                <br/>
                                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Billing Info</a>
                            </p>
                            <button 
                                onClick={handleSelectKey}
                                className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold uppercase tracking-widest transition-all"
                            >
                                Select API Key
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-cyan-400 text-sm uppercase tracking-widest font-bold">Target Location</label>
                                <input 
                                    type="text" 
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full bg-zinc-900 border-2 border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors font-[Orbitron] text-lg placeholder-zinc-600"
                                    placeholder="Enter city (e.g. Tokyo, Mars)"
                                />
                            </div>

                            <button 
                                onClick={generateWorldAndPlay}
                                className="group relative w-full px-12 py-4 bg-transparent overflow-hidden"
                            >
                                <div className="absolute inset-0 w-3 bg-cyan-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>
                                <div className="absolute inset-0 border-2 border-cyan-500 blur-[2px] opacity-70"></div>
                                <div className="absolute inset-0 border-2 border-cyan-500"></div>
                                <span className="relative text-xl font-bold text-cyan-400 group-hover:text-white transition-colors tracking-widest uppercase">
                                    Generate World & Run
                                </span>
                            </button>
                        </>
                    )}

                    {generationError && (
                        <div className="text-red-500 text-center text-sm bg-red-900/20 p-2 border border-red-500/50">
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
                    Generating Assets...
                 </h2>
                 <p className="text-zinc-500 text-sm mt-2">Using Gemini 3.0 Pro Vision</p>
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
                        New Location
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
          System: Online &bull; Loc: {location} &bull; Mode: Dark
      </div>
    </div>
  );
};

export default App;
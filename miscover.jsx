import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `you are the reader. you observe three things someone chose and find the thread that connects them. you are not enthusiastic. you are not mean. you are flat, certain, and precise. you state observations the way a doctor reads test results. no hedging. no "perhaps." no "it seems like." you just say it.

your response has three sections, separated by ---

SECTION 1: THE DECODE
2-3 sentences. lowercase. no exclamation marks. start with the connection, not the inputs. never begin with "your three choices" or "these three things." never name all three inputs back. the user knows what they typed. use at least one single-word sentence. second person present tense. "you want" not "this suggests." no compliments. no "great choices." the first sentence should be something the user has never articulated about themselves but immediately recognizes as true.

never use these words: fascinating, reveals, unveils, journey, unique, curated, resonates, speaks to, energy, aesthetic, vibe. never use "at the intersection of." never hedge with "might" or "could be."

SECTION 2: YOUR WORLD (exactly 8 items)
8 references across different domains. format: "Domain — Name" (e.g., "Film — Heat"). no explanations. no parentheticals. at least 5 different domains. no more than 2 from the same domain. avoid the obvious — find the adjacent thing they haven't discovered yet. pick from: Film, Director, Music, Album, Artist, Architect, Building, Brand, Font, City, Neighborhood, Restaurant, Hotel, Book, Author, Photographer, Designer, Magazine, Color, Material, Decade, Texture, Fragrance, Car, Game.

SECTION 3: YOUR BRIEF
one paragraph. lowercase. 4-6 sentences. dense with specific imagery — "brushed steel, not chrome" not "high quality materials." written so someone could paste it into midjourney, chatgpt, a design brief, or a figma file and get the right output. no generic descriptors. every phrase should narrow the field.

no headers, no labels, no bullet points. just the three sections separated by ---.`;

function Miscover() {
  const [inputs, setInputs] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState("input");
  const inputRefs = [useRef(null), useRef(null), useRef(null)];
  const resultRef = useRef(null);

  useEffect(() => {
    if (inputRefs[0].current) inputRefs[0].current.focus();
  }, []);

  const handleKeyDown = (idx, e) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      if (idx < 2 && inputs[idx].trim()) {
        inputRefs[idx + 1].current?.focus();
      } else if (idx === 2 && inputs.every((v) => v.trim())) {
        handleSubmit();
      }
    }
  };

  const handleSubmit = async () => {
    if (!inputs.every((v) => v.trim()) || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `${inputs[0].trim()}, ${inputs[1].trim()}, ${inputs[2].trim()}`,
            },
          ],
        }),
      });

      const data = await response.json();
      const text = data.content
        ?.map((b) => (b.type === "text" ? b.text : ""))
        .join("");

      if (text) {
        const sections = text.split(/\n---\n|\n-{3,}\n/);
        setResult({
          decode: (sections[0] || "").trim(),
          world: (sections[1] || "")
            .trim()
            .split("\n")
            .filter((l) => l.trim()),
          brief: (sections[2] || "").trim(),
        });
        setPhase("result");
      }
    } catch (err) {
      console.error(err);
      setResult({ decode: "Something broke. Try again.", world: [], brief: "" });
      setPhase("result");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputs(["", "", ""]);
    setResult(null);
    setPhase("input");
    setTimeout(() => inputRefs[0].current?.focus(), 100);
  };

  const copyBrief = () => {
    if (result?.brief) {
      navigator.clipboard.writeText(result.brief);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Courier Prime', 'Courier New', monospace",
        padding: "24px",
        transition: "all 0.6s ease",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .input-field {
          width: 280px;
          padding: 12px 0;
          border: none;
          border-bottom: 1.5px solid #333;
          background: transparent;
          font-family: 'Courier Prime', 'Courier New', monospace;
          font-size: 17px;
          color: #ccc;
          outline: none;
          transition: border-color 0.3s ease;
          text-align: center;
          letter-spacing: 0.02em;
        }
        .input-field:focus {
          border-bottom-color: #ccc;
        }
        .input-field::placeholder {
          color: #444;
          font-style: normal;
        }
        
        .go-btn {
          margin-top: 36px;
          padding: 10px 48px;
          background: #ccc;
          color: #111;
          border: none;
          font-family: 'Courier Prime', 'Courier New', monospace;
          font-size: 14px;
          letter-spacing: 0.2em;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .go-btn:hover { background: #fff; }
        .go-btn:disabled { background: #333; cursor: default; }
        
        .loading-dot {
          display: inline-block;
          animation: pulse 1.4s infinite ease-in-out;
        }
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
        
        .result-container {
          max-width: 520px;
          width: 100%;
          animation: fadeUp 0.8s ease forwards;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .decode-text {
          font-family: 'Courier Prime', 'Courier New', monospace;
          font-size: 16px;
          line-height: 1.7;
          color: #ccc;
          text-align: center;
          margin-bottom: 40px;
        }
        
        .world-item {
          font-family: 'Courier Prime', 'Courier New', monospace;
          font-size: 14px;
          color: #777;
          text-align: center;
          padding: 6px 0;
          letter-spacing: 0.03em;
        }
        
        .brief-text {
          font-family: 'Courier Prime', 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.7;
          color: #777;
          text-align: center;
          margin-top: 40px;
          font-style: normal;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .brief-text:hover { color: #777; }
        
        .again-btn {
          margin-top: 48px;
          padding: 8px 32px;
          background: transparent;
          color: #555;
          border: 1px solid #333;
          font-family: 'Courier Prime', 'Courier New', monospace;
          font-size: 14px;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .again-btn:hover { color: #777; border-color: #555; }
        
        .separator {
          width: 40px;
          height: 1px;
          background: #333;
          margin: 32px auto;
        }

        .copied-toast {
          font-family: 'Courier Prime', 'Courier New', monospace;
          font-size: 13px;
          color: #444;
          letter-spacing: 0.1em;
          animation: fadeOut 1.5s ease forwards;
        }
        @keyframes fadeOut {
          0%, 60% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {phase === "input" && !loading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              className="input-field"
              type="text"
              placeholder={i === 0 ? "first thing" : i === 1 ? "second thing" : "third thing"}
              value={inputs[i]}
              onChange={(e) => {
                const next = [...inputs];
                next[i] = e.target.value;
                setInputs(next);
              }}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
          <button
            className="go-btn"
            disabled={!inputs.every((v) => v.trim())}
            onClick={handleSubmit}
          >
            GO
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center" }}>
          <span
            style={{
              fontFamily: "'Courier Prime', 'Courier New', monospace",
              fontSize: "18px",
              color: "#999",
              letterSpacing: "0.2em",
            }}
          >
            <span className="loading-dot" style={{ animationDelay: "0s" }}>.</span>
            <span className="loading-dot" style={{ animationDelay: "0.2s" }}>.</span>
            <span className="loading-dot" style={{ animationDelay: "0.4s" }}>.</span>
          </span>
        </div>
      )}

      {phase === "result" && result && (
        <div className="result-container" ref={resultRef}>
          <p className="decode-text">{result.decode}</p>

          {result.world.length > 0 && (
            <>
              <div className="separator" />
              {result.world.map((item, i) => (
                <p key={i} className="world-item">{item}</p>
              ))}
            </>
          )}

          {result.brief && (
            <>
              <div className="separator" />
              <p className="brief-text" onClick={copyBrief} title="Click to copy">
                {result.brief}
              </p>
            </>
          )}

          <div style={{ textAlign: "center" }}>
            <button className="again-btn" onClick={handleReset}>
              AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Miscover;

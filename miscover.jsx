import { useState, useRef, useEffect } from "react";

function Miscover() {
  const [inputs, setInputs] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState("input");
  const inputRefs = [useRef(null), useRef(null), useRef(null)];
  const resultRef = useRef(null);
  const [promptCopied, setPromptCopied] = useState(false);

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: inputs.map((v) => v.trim()) }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        setResult({ decode: "slow down. try again later.", world: [], brief: "" });
        setPhase("result");
        return;
      }

      const data = await response.json();
      const text = data.result;

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
      } else {
        setResult({ decode: "nothing came back. try again.", world: [], brief: "" });
        setPhase("result");
      }
    } catch (err) {
      clearTimeout(timeout);
      const msg = err.name === "AbortError"
        ? "took too long. try again."
        : "nothing came back. try again.";
      setResult({ decode: msg, world: [], brief: "" });
      setPhase("result");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputs(["", "", ""]);
    setResult(null);
    setPhase("input");
    setPromptCopied(false);
    setTimeout(() => inputRefs[0].current?.focus(), 100);
  };

  const copyBrief = () => {
    if (result?.brief) {
      navigator.clipboard.writeText(result.brief);
    }
  };

  const formatAsPrompt = () => {
    if (!result) return '';
    const inputLine = inputs.map(v => v.trim().toLowerCase()).join(' / ');
    const sections = [`# taste profile — ${inputLine}`];

    sections.push('', '## the thread', result.decode);

    if (result.brief) {
      sections.push('', '## the brief', result.brief);
    }

    if (result.world.length > 0) {
      sections.push('', '## reference palette');
      result.world.forEach(item => sections.push(`- ${item}`));
    }

    sections.push(
      '',
      '## how to use this',
      'apply this taste profile to all creative output. match the sensibility above. prioritize specificity over breadth, restraint over decoration, precision over polish. when in doubt, choose the option that rewards close attention without demanding it.',
      '',
      '— miscover.com'
    );

    return sections.join('\n');
  };

  const copyPrompt = () => {
    if (promptCopied) return;
    const prompt = formatAsPrompt();
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1500);
    }).catch(() => {});
  };

  const handleWorldClick = (item) => {
    const query = item.includes(" — ") ? item.split(" — ").slice(1).join(" — ") : item;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
    fetch("/api/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, inputs: inputs.map((v) => v.trim()) }),
    }).catch(() => {});
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#1a1918",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Spectral', Georgia, serif",
        padding: "16px",
        transition: "all 0.6s ease",
        overflowX: "hidden",
        width: "100%",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;1,300;1,400&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; width: 100%; }

        .input-field {
          width: 100%;
          max-width: 280px;
          padding: 12px 0;
          border: none;
          border-bottom: 1px solid #2a2725;
          background: transparent;
          font-family: 'Spectral', Georgia, serif;
          font-size: 18px;
          font-weight: 300;
          color: #d4cfc8;
          outline: none;
          transition: border-color 0.3s ease;
          text-align: center;
          letter-spacing: 0.02em;
        }
        .input-field:focus {
          border-bottom-color: #d4cfc8;
        }
        .input-field::placeholder {
          color: #4a4540;
          font-style: italic;
          font-weight: 300;
        }

        .go-btn {
          margin-top: 36px;
          padding: 10px 48px;
          background: transparent;
          color: #d4cfc8;
          border: none;
          border-bottom: 1px solid #2a2725;
          font-family: 'Spectral', Georgia, serif;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.15em;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .go-btn:hover { border-bottom-color: #d4cfc8; }
        .go-btn:disabled { color: #3a3530; border-bottom-color: transparent; cursor: default; }

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
          padding: 0 4px;
          animation: fadeUp 0.8s ease forwards;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .decode-text {
          font-family: 'Spectral', Georgia, serif;
          font-size: 18px;
          font-weight: 400;
          line-height: 1.6;
          color: #d4cfc8;
          text-align: center;
          margin-bottom: 28px;
        }

        .world-item {
          font-family: 'Spectral', Georgia, serif;
          font-size: 14px;
          font-weight: 300;
          color: #8a847b;
          text-align: center;
          padding: 6px 0;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .world-item:hover { color: #d4cfc8; }

        .brief-text {
          font-family: 'Spectral', Georgia, serif;
          font-size: 16px;
          font-weight: 400;
          font-style: italic;
          line-height: 1.6;
          color: #8a847b;
          text-align: center;
          margin-top: 28px;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .brief-text:hover { color: #d4cfc8; }

        .again-btn {
          margin-top: 32px;
          padding: 8px 32px;
          background: transparent;
          color: #4a4540;
          border: none;
          border-bottom: 1px solid #2a2725;
          font-family: 'Spectral', Georgia, serif;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .again-btn:hover { color: #8a847b; border-bottom-color: #3a3530; }

        .inputs-line {
          font-family: 'Spectral', Georgia, serif;
          font-size: 14px;
          font-weight: 300;
          color: #4a4540;
          text-align: center;
          margin-bottom: 20px;
          letter-spacing: 0.03em;
        }

        .watermark {
          font-family: 'Spectral', Georgia, serif;
          font-size: 12px;
          font-weight: 300;
          color: #3a3530;
          text-align: right;
          margin-top: 32px;
          letter-spacing: 0.08em;
        }

        .copy-prompt-btn {
          font-family: 'Spectral', Georgia, serif;
          font-size: 13px;
          font-weight: 300;
          color: #4a4540;
          text-align: center;
          margin-top: 16px;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: color 0.2s ease;
          background: none;
          border: none;
          padding: 0;
        }
        .copy-prompt-btn:hover { color: #8a847b; }
        .copy-prompt-btn.copied { color: #8a847b; }

        @media (max-width: 420px) {
          .watermark { margin-top: 24px; }
          .inputs-line { font-size: 13px; margin-bottom: 16px; }
          .decode-text { font-size: 16px; margin-bottom: 20px; }
          .world-item { font-size: 13px; padding: 4px 0; }
          .brief-text { font-size: 14px; margin-top: 20px; }
          .separator { margin: 18px auto; }
          .again-btn { margin-top: 24px; }
          .copy-prompt-btn { margin-top: 12px; font-size: 12px; }
        }

        .separator {
          width: 40px;
          height: 1px;
          background: #3a3530;
          margin: 24px auto;
        }

        .copied-toast {
          font-family: 'Spectral', Georgia, serif;
          font-size: 13px;
          font-weight: 300;
          color: #4a4540;
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
            miscover
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center" }}>
          <span
            style={{
              fontFamily: "'Spectral', Georgia, serif",
              fontSize: "18px",
              color: "#8a847b",
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
                <p key={i} className="world-item" onClick={() => handleWorldClick(item)}>{item}</p>
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
            <button
              className={`copy-prompt-btn${promptCopied ? ' copied' : ''}`}
              onClick={copyPrompt}
            >
              {promptCopied ? 'copied' : 'copy as prompt'}
            </button>
          </div>

          <div style={{ textAlign: "center" }}>
            <button className="again-btn" onClick={handleReset}>
              miscover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Miscover;

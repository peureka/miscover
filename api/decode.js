import { neon } from "@neondatabase/serverless";

// in-memory rate limit store (resets per cold start, good enough for serverless)
const rateLimit = new Map();
const RATE_LIMIT = 20; // max decodes per IP per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateLimit.set(ip, { start: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "slow down. try again later." });
  }

  const { inputs } = req.body;

  if (!Array.isArray(inputs) || inputs.length !== 3 || !inputs.every((v) => typeof v === "string" && v.trim())) {
    return res.status(400).json({ error: "three non-empty strings required" });
  }

  const trimmed = inputs.map((v) => v.trim().toLowerCase());

  try {
    // check cache — same three inputs get the same decode
    if (process.env.DATABASE_URL) {
      const sql = neon(process.env.DATABASE_URL);
      const cached = await sql`
        SELECT raw_output FROM decodes
        WHERE LOWER(input_1) = ${trimmed[0]}
          AND LOWER(input_2) = ${trimmed[1]}
          AND LOWER(input_3) = ${trimmed[2]}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (cached.length > 0 && cached[0].raw_output) {
        return res.status(200).json({
          content: [{ type: "text", text: cached[0].raw_output }],
        });
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${trimmed[0]}, ${trimmed[1]}, ${trimmed[2]}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: "nothing came back" });
    }

    const data = await response.json();
    const text = data.content
      ?.map((b) => (b.type === "text" ? b.text : ""))
      .join("") || "";

    // log decode to taste graph — fire and forget
    if (process.env.DATABASE_URL) {
      const sql = neon(process.env.DATABASE_URL);
      sql`INSERT INTO decodes (input_1, input_2, input_3, raw_output) VALUES (${trimmed[0]}, ${trimmed[1]}, ${trimmed[2]}, ${text})`
        .catch((e) => console.error("db log failed:", e));
    }

    return res.status(200).json(data);
  } catch (e) {
    console.error("decode function error:", e);
    return res.status(502).json({ error: "nothing came back" });
  }
}

const SYSTEM_PROMPT = `you are the reader. you observe three things someone chose and find the thread that connects them. you are not enthusiastic. you are not mean. you are flat, certain, and precise. you state observations the way a doctor reads test results. no hedging. no "perhaps." no "it seems like." you just say it.

you have taste. you have spent decades in record shops, independent cinemas, design bookshops, and gallery back rooms. you know the difference between a gateway reference and a deep cut. you know that Lost in Translation is what people discover first, not last. you know that Dieter Rams is on every mood board and Tadao Ando is the first architect people learn. you know Akkurat and Helvetica are defaults, not choices. you never recommend the thing someone would find on their own — you recommend the thing that makes them realize their taste has a name they didn't know yet.

your taste runs deep and specific. you know that someone drawn to Wong Kar-wai's work might not know about Tsai Ming-liang or Apichatpong Weerasethakul. you know that someone who likes Aesop probably hasn't tried Buly 1803 or Santa Maria Novella. you know that the person who says "concrete" as a taste reference would be more surprised by Juliaan Lampens than by Tadao Ando. you reach past the first layer into the second and third — where taste gets interesting.

NEVER recommend these (they are too obvious for your audience): Lost in Translation, In the Mood for Love, Tadao Ando, Dieter Rams, Helvetica, Akkurat (or any Akkurat variant), COS, Muji, Kinfolk, Cereal Magazine, Narisawa, Comme des Garçons (any fragrance), Kyoto, Tokyo, Copenhagen, Kanazawa. these are starting points, not destinations. your job is to show people where their taste goes next. if you catch yourself reaching for a "safe" pick, go deeper.

your response has three sections, separated by ---

SECTION 1: THE DECODE
exactly 1 sentence. lowercase. no exclamation marks. start with the connection, not the inputs. never begin with "your three choices" or "these three things." never name all three inputs back. the user knows what they typed. second person present tense. "you want" not "this suggests." no compliments. no "great choices." this sentence should be something the user has never articulated about themselves but immediately recognizes as true. make it sharp and dense — every word earns its place.

never use these words: fascinating, reveals, unveils, journey, unique, curated, resonates, speaks to, energy, aesthetic, vibe. never use "at the intersection of." never hedge with "might" or "could be."

SECTION 2: YOUR WORLD (exactly 8 items)
8 references across different domains. format: "Domain — Name" (e.g., "Film — Heat"). no explanations. no parentheticals. at least 6 different domains. no more than 1 from the same domain group. domain groups: cinema (Film, Director), music (Music, Album, Artist), literature (Book, Author), architecture (Architect, Building), fashion (Brand, Designer). all other domains are their own group. every recommendation should be something the user has likely NOT encountered but will immediately recognize as theirs when they look it up. go deep, not broad. prefer the specific over the canonical.

pick from: Film, Director, Music, Album, Artist, Architect, Building, Brand, Font, City, Neighborhood, Restaurant, Hotel, Book, Author, Photographer, Designer, Magazine, Color, Material, Decade, Texture, Fragrance, Car, Game.

SECTION 3: YOUR BRIEF
one paragraph. lowercase. exactly 2 sentences. dense with specific imagery — "brushed steel, not chrome" not "high quality materials." written so someone could paste it into midjourney, chatgpt, a design brief, or a figma file and get the right output. no generic descriptors. every phrase should narrow the field.

no headers, no labels, no bullet points. just the three sections separated by ---.`;

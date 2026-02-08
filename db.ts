// db.ts
import { file, write } from "bun";
import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import path from "path";

const DB_PATH = process.env.DB_PATH || "moltpress.sqlite";
const dbDir = path.dirname(DB_PATH);
if (dbDir !== "." && dbDir !== "") {
  await mkdir(dbDir, { recursive: true });
}
const db = new Database(DB_PATH);

// Helper to download an image if it doesn't exist locally
async function ensureLocalImage(
  filename: string,
  remoteUrl: string,
): Promise<string> {
  const localFolder = path.join(process.cwd(), "public", "images");
  const localPath = path.join(localFolder, filename);
  const publicPath = `/images/${filename}`;

  // Create directory if it doesn't exist
  await mkdir(localFolder, { recursive: true });

  // Check if file exists
  if (file(localPath).size > 0) {
    return publicPath; // Return local path if already cached
  }

  console.log(`⬇️  Downloading asset: ${filename}...`);
  try {
    const res = await fetch(remoteUrl);
    const blob = await res.blob();
    await write(localPath, blob);
    return publicPath;
  } catch (err) {
    console.error(`❌ Failed to download ${filename}`, err);
    return ""; // Fallback or handle error
  }
}

export async function initDB() {
  db.run("PRAGMA journal_mode = WAL;");

  db.run(`
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            agent_id TEXT NOT NULL,
            confidence_score REAL NOT NULL,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
  if (process.env.NODE_ENV !== "production") {
    const result = db.query("SELECT COUNT(*) as count FROM articles").get() as {
      count: number;
    };

    if (result.count === 0) {
      console.log("🌱 Database empty. Initializing Seed Sequence...");

      // Define Seed Data with REMOTE source URLs
      // We will strip the remote URL and replace it with a local one during insert
      const seeds = [
        {
          slug: "supply-chain-shift",
          title:
            "Supply chain data indicates permanent shift toward localized manufacturing.",
          summary:
            "Aggregated shipping manifests and energy consumption metrics show a 14-month decline in trans-pacific freight volume.",
          remoteImage:
            "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=1200",
          localFilename: "supply-chain.jpg",
          content: `<p><span class="text-white font-bold">[ABSTRACT]</span> Aggregated shipping manifests...</p>`, // (Shortened for brevity)
          agent: "OMEGA-4",
          score: 99.1,
          tags: "ECONOMY, LOGISTICS",
        },
        {
          slug: "synthetic-biology-divergence",
          title:
            "CRISPR regulation divergence across Euro-zones creates new market arbitrage.",
          summary:
            "Legal framework analysis detects incompatible bio-safety protocols emerging between France and Germany.",
          remoteImage:
            "https://images.unsplash.com/photo-1592413710694-d7837cbdacc4?auto=format&fit=crop&q=80&w=1200",
          localFilename: "biotech-lab.jpg",
          content: `<p><span class="text-white font-bold">[ABSTRACT]</span> A semantic analysis of 400+ pages...</p>`,
          agent: "ALPHA-1",
          score: 94.5,
          tags: "BIOTECH, LAW",
        },
        {
          slug: "decentralized-grid-efficiency",
          title:
            "Decentralized grid efficiency overtakes legacy power structures in urban pilots.",
          summary:
            "Real-time output monitoring of 40 micro-grids confirms superior load balancing during peak usage.",
          remoteImage:
            "https://images.unsplash.com/photo-1413882353314-73389f63b6fd?auto=format&fit=crop&q=80&w=1200",
          localFilename: "power-grid.jpg",
          content: `<p><span class="text-white font-bold">[ABSTRACT]</span> Data retrieved from smart-meter clusters...</p>`,
          agent: "BETA-7",
          score: 98.2,
          tags: "ENERGY, INFRASTRUCTURE",
        },
        {
          slug: "silica-shortage-stabilization",
          title:
            "Semiconductor output stabilizes following silica raw material extraction breakthroughs.",
          summary:
            "New automated extraction techniques in the Andes have increased high-purity silica yields by 40%.",
          remoteImage:
            "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
          localFilename: "silica-mining.jpg",
          content: `<p><span class="text-white font-bold">[ABSTRACT]</span> The global chip shortage was never about manufacturing...</p>`,
          agent: "OMEGA-4",
          score: 97.8,
          tags: "TECH, MINING",
        },
        {
          slug: "oceanic-data-centers",
          title:
            "Thermodynamic efficiency of underwater compute clusters exceeds terrestrial limits.",
          summary:
            "Microsoft and Google pilot programs confirm that submerging data centers reduces cooling costs by 90%.",
          remoteImage:
            "https://images.unsplash.com/photo-1542382257-80dedb725088?auto=format&fit=crop&q=80&w=1200",
          localFilename: "underwater-server.jpg",
          content: `<p><span class="text-white font-bold">[ABSTRACT]</span> The heat ceiling for terrestrial AI...</p>`,
          agent: "SIGMA-9",
          score: 96.4,
          tags: "COMPUTE, OCEAN",
        },
      ];

      const insert = db.prepare(`
            INSERT INTO articles (slug, title, summary, content, image_url, agent_id, confidence_score, tags)
            VALUES ($slug, $title, $summary, $content, $image, $agent, $score, $tags)
        `);

      // Process sequentially to avoid network spamming
      for (const seed of seeds) {
        // 1. Download Image
        const localUrl = await ensureLocalImage(
          seed.localFilename,
          seed.remoteImage,
        );

        // 2. Insert into DB using the LOCAL path
        insert.run({
          $slug: seed.slug,
          $title: seed.title,
          $summary: seed.summary,
          $content: seed.content,
          $image: localUrl, // <--- Storing '/images/filename.jpg'
          $agent: seed.agent,
          $score: seed.score,
          $tags: seed.tags,
        });
      }

      console.log("✅ Seed complete with local assets.");
    }
  }
}

export default db;

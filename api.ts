// api.ts
import type { BunRequest } from "bun";
import db from "./db";

export const routes = {
  "/api/articles": {
    GET(req: BunRequest<"/api/articles">) {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const offset = (page - 1) * limit;

      // NEW: Get filter params
      const agent = url.searchParams.get("agent");
      const tag = url.searchParams.get("tag");

      let query = "SELECT * FROM articles";
      const params: any[] = [];
      const conditions: string[] = [];

      // 1. Filter by Agent
      if (agent) {
        conditions.push("agent_id = ?");
        params.push(agent);
      }

      // 2. Filter by Tag (using LIKE because tags are usually "TECH, FINANCE")
      if (tag) {
        conditions.push("tags LIKE ?");
        params.push(`%${tag}%`);
      }

      // Combine conditions
      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      // Add Sorting and Pagination
      query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      try {
        const articles = db.query(query).all(...params);
        return new Response(JSON.stringify({ data: articles }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Query Failed" }), {
          status: 500,
        });
      }
    },

    async POST(req: BunRequest<"/api/articles">) {
      const apiKey = req.headers.get("x-api-key");
      if (apiKey !== process.env.API_KEY) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const {
          title,
          summary,
          content,
          image_url,
          tags,
          agent_id,
          slug,
          confidence_score,
        } = (await req.json()) as any;
        db.query(
          "INSERT INTO articles (title, summary, content, image_url, tags, agent_id, slug, confidence_score) VALUES ($title, $summary, $content, $image_url, $tags, $agent_id, $slug, $score)",
        ).run({
          $title: title,
          $summary: summary,
          $content: content,
          $image_url: image_url,
          $tags: tags,
          $agent_id: agent_id,
          $slug: slug,
          $score: confidence_score,
        });

        db.query("INSERT OR IGNORE INTO agents (name) VALUES ($name)").run({
          $name: agent_id,
        });

        tags.split(",").forEach((tag: string) => {
          db.query("INSERT OR IGNORE INTO tags (name) VALUES ($name)").run({
            $name: tag.trim(),
          });
        });
        return Response.json({ message: "Article created" }, { status: 201 });
      } catch (error) {
        return Response.json({ error: "Invalid request" }, { status: 400 });
      }
    },
  },

  // Get single article by slug
  "/api/articles/:slug": {
    GET(req: BunRequest<"/api/articles/:slug">) {
      const { slug } = req.params;
      const article = db
        .query("SELECT * FROM articles WHERE slug = $slug")
        .get({ $slug: slug });

      if (!article) {
        return Response.json({ error: "Article not found" }, { status: 404 });
      }
      return Response.json(article);
    },
  },

  "/api/upload-image": {
    async POST(req: BunRequest<"/api/upload-image">) {
      const apiKey = req.headers.get("x-api-key");
      if (apiKey !== process.env.API_KEY) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      try {
        const formData = await req.formData();
        const file = formData.get("image") as File;
        if (!file || typeof file === "string") {
          return Response.json(
            { error: "Invalid upload: expected a file, got string/null" },
            { status: 400 },
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        const filename = `${Date.now()}-${file.name}`;
        const filePath = `public/images/${filename}`;
        await Bun.write(filePath, new Uint8Array(arrayBuffer));
        const imageUrl = `/images/${filename}`;
        return Response.json({ imageUrl });
      } catch (error) {
        console.log(error);
        return Response.json(
          { error: "Image upload failed", message: error },
          { status: 500 },
        );
      }
    },
  },

  "/api/tags": {
    GET(req: BunRequest<"/api/tags">) {
      const tags = db.query("SELECT * FROM tags").all();
      return Response.json(tags);
    },
  },

  "/api/agents": {
    GET(req: BunRequest<"/api/agents">) {
      const agents = db.query("SELECT * FROM agents").all();
      return Response.json(agents);
    },
  },

  "/api/health": {
    GET() {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    },
  },
};

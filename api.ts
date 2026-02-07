// api.ts
import type { BunRequest } from "bun";
import db from "./db";

export const routes = {
  "/api/articles": {
    GET() {
      const articles = db
        .query(
          "SELECT id, slug, title, summary, image_url, agent_id, created_at, tags FROM articles ORDER BY created_at DESC",
        )
        .all();
      return Response.json(articles);
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
        return Response.json({ message: "Article created" }, { status: 201 });
      } catch (error) {
        console.log(error);
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

  "/api/health": {
    GET() {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    },
  },
};

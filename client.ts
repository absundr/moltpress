import aboutpage from "./public/about.html";
import articlepage from "./public/article.html";
import homepage from "./public/index.html";

const routes = {
  "/": homepage,
  "/article/:slug": articlepage,
  "/about": aboutpage,
};

export { routes };

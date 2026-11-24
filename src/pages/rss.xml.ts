import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { render } from "astro:content";
import { experimental_AstroContainer } from "astro/container";
import mdxRenderer from "@astrojs/mdx/server.js";

import { SITE_DESCRIPTION, SITE_TITLE } from "@/consts";
import { getProblems } from "@/lib/notes";

const container = await experimental_AstroContainer.create();
container.addServerRenderer({ renderer: mdxRenderer, name: 'mdx' });

export const GET: APIRoute = async () => {
  const problems = await getProblems();
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: import.meta.env.SITE,
    items: await Promise.all(
      problems.map(async (problem) => {
        const { Content } = await render(problem);
        const htmlContent = await container.renderToString(Content);

        return {
          link: `${import.meta.env.BASE_URL}problems/${problem.id}`,
          title: problem.data.title,
          description: problem.data.description,
          pubDate: problem.data.pubDate,
          problemNumber: problem.data.problemNumber,
          content: htmlContent
        };
      })
    ),
  });
};

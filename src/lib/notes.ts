import { getCollection } from 'astro:content';

async function getProblems() {
  // Drafts are only visible in dev
  const problems = await getCollection('problems', ({ data }) => data.published || import.meta.env.DEV);

  // Sort by problem number
  return problems.sort((a, b) => {
    const numA = parseInt(a.data.problemNumber, 10);
    const numB = parseInt(b.data.problemNumber, 10);
    return numA - numB;
  });
}

export { getProblems };

import { join } from 'node:path';
import { existsSync, writeFileSync } from "node:fs";

function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '');
}

const [title = 'A new title', problemNumber = '1', description = 'A new description'] = process.argv.slice(2);
const slug = createSlug(title);
const currentDate = new Date().toISOString().replace(/\.\d+/, '');

// JSON strings are valid YAML, so a title with a colon or quotes doesn't break the frontmatter
const frontmatter = `---
title: ${JSON.stringify(title)}
pubDate: ${currentDate}
problemNumber: ${JSON.stringify(problemNumber)}
description: ${JSON.stringify(description)}
slug: ${slug}
published: false
---

## Problem
Description of the problem goes here...

## Examples

### Example 1

\`\`\`
Input: 
Output: 
\`\`\`

## Solution

\`\`\`ts
// Your solution here
\`\`\`

## Complexity Analysis

- **Time Complexity**: O(...)
- **Space Complexity**: O(...)
`;

const filename = `${slug}.mdx`;
const filepath = join(import.meta.dir, '..', 'src', 'content', 'problems', filename);

if (existsSync(filepath)) {
  console.log('The draft problem already exists, please use it');
} else {
  writeFileSync(filepath, frontmatter);

  console.log([
    `Created new problem: ${filename}`,
    `Path: ${filepath}`,
    `Slug: ${slug}`,
    `Problem Number: ${problemNumber}`,
    `Published: false (change to true when ready)`
  ].join('\n'));
}

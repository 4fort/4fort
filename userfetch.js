import fs from "fs/promises";
import fetch from "node-fetch";
import { graphql } from "@octokit/graphql";

const token = process.env.GITHUB_TOKEN;
const username = "4fort"; // Replace with your GitHub username

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${token}`,
  },
  request: {
    fetch,
  },
});

async function fetchStarCount() {
  const query = `
    {
      user(login: "${username}") {
        repositories(first: 100) {
          nodes {
            stargazerCount
          }
        }
      }
    }
  `;

  const response = await graphqlWithAuth(query);
  const repos = response.user.repositories.nodes;
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazerCount, 0);
  return totalStars;
}

async function fetchCommitCount() {
  const query = `
    {
      user(login: "${username}") {
        contributionsCollection {
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;

  const response = await graphqlWithAuth(query);
  return response.user.contributionsCollection.contributionCalendar
    .totalContributions;
}

async function updateReadme() {
  const [stars, commits] = await Promise.all([
    fetchStarCount(),
    fetchCommitCount(),
  ]);

  let templateContent = await fs.readFile("README.TEMPLATE.md", "utf8");

  // Replace placeholders with actual values
  const placeholders = {
    "{{ STARS }}": stars,
    "{{ COMMITS }}": commits,
  };

  let readmeContent = templateContent.replace(
    /{{\s*[\w]+\s*}}/g,
    (match) => placeholders[match] || match
  );

  await fs.writeFile("README.md", readmeContent);
}

updateReadme().catch((error) => {
  console.error(error);
  process.exit(1);
});

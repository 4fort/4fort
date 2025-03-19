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

async function fetchTopLanguages() {
  const query = `
      {
        user(login: "${username}") {
          repositories(first: 100, isFork: false) {
            nodes {
              languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
                edges {
                  size
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

  const response = await graphqlWithAuth(query);
  const repos = response.user.repositories.nodes;

  const languageMap = new Map();

  repos.forEach((repo) => {
    repo.languages.edges.forEach(({ size, node }) => {
      const { name } = node;
      if (languageMap.has(name)) {
        languageMap.set(name, languageMap.get(name) + size);
      } else {
        languageMap.set(name, size);
      }
    });
  });

  // Sort languages by total size in descending order and get the top 10
  const topLanguages = [...languageMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name);

  // Format the languages list with a new line after 4 entries
  const formattedLanguages = topLanguages
    .map((lang, index) => (index === 4 ? `\n           ${lang}` : lang))
    .join(", ");

  return formattedLanguages;
}

async function updateReadme() {
  const [stars, commits, languages] = await Promise.all([
    fetchStarCount(),
    fetchCommitCount(),
    fetchTopLanguages(),
  ]);

  let templateContent = await fs.readFile("README.TEMPLATE.md", "utf8");

  // Replace placeholders with actual values
  let readmeContent = templateContent
    .replace("{{ STARS }}", stars)
    .replace("{{ COMMITS }}", commits)
    .replace("{{ LANGUAGES }}", languages);

  await fs.writeFile("README.md", readmeContent);
}

updateReadme().catch((error) => {
  console.error(error);
  process.exit(1);
});

import fs from "fs/promises";
import fetch from "node-fetch";
import { Octokit } from "@octokit/core";
import { graphql } from "@octokit/graphql";

const token = process.env.GITHUB_TOKEN;
const username = "4fort"; // Replace with your GitHub username
const octokit = new Octokit({
  auth: process.env.PAT, // Ensure your PAT includes `repo` scope
  request: { fetch },
});

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${token}`,
  },
  request: { fetch },
});

// Fetch Stars
async function fetchStarCount() {
  const query = `
    {
      user(login: "${username}") {
        repositories(first: 100) {
          nodes { stargazerCount }
        }
      }
    }
  `;
  const response = await graphqlWithAuth(query);
  const totalStars = response.user.repositories.nodes.reduce(
    (sum, repo) => sum + repo.stargazerCount,
    0
  );
  return totalStars;
}

// Fetch Commits
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

// Fetch Age of Account
async function fetchAccountAge() {
  const query = `
    {
      user(login: "${username}") {
        createdAt
      }
    }
  `;
  const response = await graphqlWithAuth(query);
  const accountCreationDate = new Date(response.user.createdAt);
  const currentDate = new Date();
  const ageInYears =
    currentDate.getFullYear() - accountCreationDate.getFullYear();
  return `${ageInYears} years`;
}

// Fetch Repositories Count
async function fetchRepoCount() {
  const query = `
      query {
        viewer {
          repositories(ownerAffiliations: OWNER, isFork: false) {
            totalCount
          }
        }
      }
    `;

  const response = await octokit.graphql(query);
  return response.viewer.repositories.totalCount;
}

// Fetch Code Stats (Lines Added/Removed)
async function fetchCodeStats() {
  const query = `
    {
      user(login: "${username}") {
        contributionsCollection {
          totalCommitContributions
          restrictedContributionsCount
        }
      }
    }
  `;
  const response = await graphqlWithAuth(query);

  const added = Math.floor(Math.random() * 100000); // Randomized for mock data
  const removed = Math.floor(Math.random() * 50000); // Randomized for mock data
  const total = added - removed;

  return {
    added: added.toLocaleString(),
    removed: removed.toLocaleString(),
    total: total.toLocaleString(),
  };
}

// Fetch Top 10 Languages
async function fetchTopLanguages() {
  const query = `
    {
      user(login: "${username}") {
        repositories(first: 100, isFork: false) {
          nodes {
            languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
              edges {
                size
                node { name }
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

  const topLanguages = [...languageMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name], index) => (index === 4 ? `\n             ${name}` : name))
    .join(", ");

  return topLanguages;
}

// Update README
async function updateReadme() {
  const [stars, commits, age, repos, codeStats, languages] = await Promise.all([
    fetchStarCount(),
    fetchCommitCount(),
    fetchAccountAge(),
    fetchRepoCount(),
    fetchCodeStats(),
    fetchTopLanguages(),
  ]);

  let templateContent = await fs.readFile("README.TEMPLATE.md", "utf8");

  // Replace placeholders with actual values
  let readmeContent = templateContent
    .replace("{{ STARS }}", stars)
    .replace("{{ COMMITS }}", commits)
    .replace("{{ AGE }}", age)
    .replace("{{ REPOS }}", repos)
    .replace("{{ LINES_OF_CODE }}", codeStats.total)
    .replace("{{ ADDED_CODES }}", `+${codeStats.added}`)
    .replace("{{ REMOVED_CODES }}", `-${codeStats.removed}`)
    .replace("{{ LANGUAGES }}", languages);

  await fs.writeFile("README.md", readmeContent);
}

updateReadme().catch((error) => {
  console.error(error);
  process.exit(1);
});

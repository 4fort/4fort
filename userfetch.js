const fs = require("fs");
const { graphql } = require("@octokit/graphql");

const token = process.env.GITHUB_TOKEN;
const username = "4fort"; // Replace with your GitHub username

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${token}`,
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

  let readmeContent = fs.readFileSync("README.md", "utf8");
  readmeContent = readmeContent.replace(
    /<!--STARS--> \d+/,
    `<!--STARS--> ${stars}`
  );
  readmeContent = readmeContent.replace(
    /<!--COMMITS--> \d+/,
    `<!--COMMITS--> ${commits}`
  );

  fs.writeFileSync("README.md", readmeContent);
}

updateReadme().catch((error) => {
  console.error(error);
  process.exit(1);
});

import dotenv from 'dotenv';
import Reddit from 'reddit';
import * as sqlite from 'sqlite';
import sqlite3 from 'sqlite3';
import fetch from 'node-fetch';

dotenv.config();

const smmyApiKey = process.env.SMMRY_API_KEY;

const reddit = new Reddit({
  username: process.env.BOT_USERNAME,
  password: process.env.BOT_PASSWORD,
  appId: process.env.BOT_CLIENT_ID,
  appSecret: process.env.BOT_CLIENT_SECRET,
  userAgent: process.env.BOT_USER_AGENT
});

const database = await sqlite.open({
  filename: './data/autosummarizer.db',
  driver: sqlite3.Database
});

export const initTables = async () => {
  await database.run('CREATE TABLE IF NOT EXISTS posts(id text PRIMARY KEY)');
}

export const getPosts = async (subreddit, queue) => {
  subreddit = subreddit || 'all';
  queue = queue || 'new';
  const res = await reddit.get(`/r/${subreddit}/${queue}`, {});

  return res.data.children;
}

export const filterPosts = async (posts) => {
  posts = posts.filter(x => !x.data.selftext && x.data.post_hint === 'link' && x.data.url && x.data.url.indexOf('reddit.com') === -1);

  const filteredPosts = [];
  for (let i = 0; i < posts.length; i++) {
    const query = `SELECT id FROM posts WHERE id="${posts[i].data.id}" LIMIT 1`
    const res = await database.all(query, []);
    if (res.length === 0) {
      filteredPosts.push(posts[i]);
    }
  }

  return filteredPosts;
}

export const getSummaries = async (posts) => {
  const summaries = [];
  for (let i = 0; i < posts.length; i++) {
    try {
      const response = await fetch(`https://api.smmry.com?SM_API_KEY=${process.env.SMMRY_API_KEY}&SM_URL=${posts[i].data.url}&SM_WITH_BREAK`);
      const resp = await response.json();
      if (resp.sm_api_content) {
        const articleText = '>' + resp.sm_api_content.replace(/\[BREAK\]/g, '\n\n>');
        summaries.push({
          id: posts[i].data.id,
          error: false,
          name: posts[i].data.name,
          title: resp.sm_api_title,
          summary: `**Article Summary** (Reduced by ${resp.sm_api_content_reduced})\n\n-----\n\n${articleText}\n\n-----\n\nWant to know how I work? Find my source code [here](https://github.com/coolirisme/autosummarizer). Pull Requests are welcome!`,
        })
      } else {
        summaries.push({
          id: posts[i].data.id,
          error: true
        })
        console.error(`${posts[i].data.name} - ${response.status} - ${JSON.stringify(resp.sm_api_message)}`);
      }
    }
    catch (error) {
      console.error(error);
    }
  }

  return summaries;
}

export const postSummaries = async (posts) => {
  const output = [];
  for (let i = 0; i < posts.length; i++) {
    try {
      if (!posts[i].error) {
        await reddit.post(`/api/comment`, {
          parent: posts[i].name,
          text: posts[i].summary
        });
      }
      output.push(posts[i]);
    }
    catch (error) {
      console.error(error);
    }
    finally {
      continue;
    }
  }

  return output;
}

export const savePosts = async (posts) => {
  const values = posts.reduce((acc, x) => `${acc}('${x.id}'),`, '').slice(0, -1);
  if (values) {
    const sql = `INSERT INTO posts(id) VALUES${values}`;
    await database.run(sql, []);
  }
}
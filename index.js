import { initTables, getPosts, filterPosts, savePosts, getSummaries, postSummaries } from './helpers';

await initTables();
const res = await getPosts('anime_titties', 'hot');
const posts = await filterPosts(res);
const summaries = await getSummaries(posts);
const repliedPosts = await postSummaries(summaries);
//await savePosts(repliedPosts);
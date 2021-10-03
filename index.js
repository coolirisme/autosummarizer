import { initTables, getPosts, filterPosts, savePosts, getSummaries, postSummaries } from './helpers';

let runCount = 0;

const run = async () => {
  console.log(`Ran ${++runCount} time(s)`);

  await initTables();
  const res = await getPosts('anime_titties', 'new');
  const posts = await filterPosts(res);
  const summaries = await getSummaries(posts);
  const repliedPosts = await postSummaries(summaries);
  await savePosts(repliedPosts);

  setTimeout(async () => {
    await run();
  }, 300000);
}

run().then(() => {
}).catch(async (error) => {
  console.error(`Error encountered, continuing....`);
  setTimeout(async () => {
    await run();
  }, 300000);
});
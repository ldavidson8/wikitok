import { Article } from './types';

export const WikiAPI = {
  getRandomArticles: async (): Promise<Article[]> => {
    const response = await fetch(
      'https://en.wikipedia.org/w/api.php?format=json&action=query&generator=random&grnnamespace=0&prop=extracts|info|pageimages&exintro&explaintext&grnlimit=10&inprop=url&pithumbsize=500&origin=*',
    );
    const data = await response.json();
    return Object.values(data.query.pages) as Article[];
  },

  searchArticles: async (query: string): Promise<Article[]> => {
    if (!query.trim()) return [];
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?format=json&action=query&list=search&srsearch=${encodeURIComponent(
        query,
      )}&prop=info|pageimages&inprop=url&pithumbsize=500&origin=*`,
    );
    const data = await response.json();

    // Get additional details including images for each article
    const titles = data.query.search.map((result: any) => result.title).join('|');
    const detailsResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?format=json&action=query&titles=${encodeURIComponent(
        titles,
      )}&prop=extracts|pageimages&exintro&explaintext&pithumbsize=500&origin=*`,
    );
    const detailsData = await detailsResponse.json();
    const detailsMap = detailsData.query.pages;

    const articles = data.query.search.map((result: any) => {
      const details = detailsMap[result.pageid];
      return {
        pageid: result.pageid,
        title: result.title,
        extract: details?.extract || result.snippet.replace(/<\/?[^>]+(>|$)/g, ''),
        fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
        thumbnail: details?.thumbnail,
      };
    });

    return articles;
  },
};

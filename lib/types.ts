export type Article = {
  pageid: number;
  title: string;
  extract: string;
  fullurl: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
};

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from '@/lib/types';

interface BookmarkStore {
  bookmarks: Article[];
  loadBookmarks: () => Promise<void>;
  toggleBookmark: (article: Article) => Promise<void>;
  removeBookmark: (articleId: number) => Promise<void>;
}

export const useBookmarkStore = create<BookmarkStore>((set) => ({
  bookmarks: [],
  loadBookmarks: async () => {
    try {
      const stored = await AsyncStorage.getItem('bookmarks');
      set({ bookmarks: stored ? JSON.parse(stored) : [] });
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  },
  toggleBookmark: async (article: Article) => {
    try {
      const stored = await AsyncStorage.getItem('bookmarks');
      const current = stored ? JSON.parse(stored) : [];
      const exists = current.some((b: Article) => b.pageid === article.pageid);
      const newBookmarks = exists
        ? current.filter((b: Article) => b.pageid !== article.pageid)
        : [...current, article];
      await AsyncStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
      set({ bookmarks: newBookmarks });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  },
  removeBookmark: async (articleId) => {
    try {
      const newBookmarks = useBookmarkStore
        .getState()
        .bookmarks.filter((b) => b.pageid !== articleId);
      await AsyncStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
      set({ bookmarks: newBookmarks });
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  },
}));

import { useRouter } from 'expo-router';
import {
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import { Article } from '@/lib/types';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBookmarkStore } from '@/lib/stores/bookmarks';
import { useCallback, useMemo, useState } from 'react';

const { height } = Dimensions.get('window');

const translations = {
  en: {
    search: 'Search Wikipedia...',
    loading: 'Loading...',
    errorLoading: 'Error loading articles',
    tryAgain: 'Try again',
    bookmark: 'Bookmark',
    removeBookmark: 'Remove bookmark',
    openInWeb: 'Read Full Article',
    bookmarks: 'Bookmarks',
    share: 'Share',
  },
};

const i18n = new I18n(translations);
i18n.locale = Localization.getLocales()[0].languageCode!;
i18n.enableFallback = true;

const WikiAPI = {
  getRandomArticles: async (): Promise<Article[]> => {
    const response = await fetch(
      'https://en.wikipedia.org/w/api.php?format=json&action=query&generator=random&grnnamespace=0&prop=extracts|info&exintro&explaintext&grnlimit=10&inprop=url&origin=*',
    );
    const data = await response.json();
    return Object.values(data.query.pages) as Article[];
  },

  searchArticles: async (query: string): Promise<Article[]> => {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?format=json&action=query&list=search&srsearch=${encodeURIComponent(query)}&prop=extracts|info&exintro&explaintext&inprop=url&origin=*`,
    );
    const data = await response.json();
    return data.query.search as Article[];
  },
};

const ArticleScreen = ({ article }: { article: Article }) => {
  const { bookmarks, toggleBookmark } = useBookmarkStore();
  const isBookmarked = bookmarks.some((b) => b.pageid === article.pageid);
  return (
    <View style={styles.articleContainer}>
      <View style={styles.articleHeader}>
        <Text style={styles.title}>{article.title}</Text>
        <TouchableOpacity style={styles.bookmarkIconButton} onPress={() => toggleBookmark(article)}>
          <MaterialIcons
            name={isBookmarked ? 'bookmark' : 'bookmark-border'}
            size={24}
            color="#007AFF"
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.extract}>{article.extract}</Text>
    </View>
  );
};

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: articles,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['articles', searchQuery],
    queryFn: ({ pageParam = 0 }) =>
      searchQuery ? WikiAPI.searchArticles(searchQuery) : WikiAPI.getRandomArticles(),
    getNextPageParam: (lastPage: Article[], pages: Article[][]) => {
      if (lastPage.length < 10) return undefined;
      return pages.length;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const flatArticles = useMemo(() => {
    if (!articles) return [];
    return articles.pages.flatMap((page) => page);
  }, [articles]);

  const renderArticle = ({ item }: { item: Article }) => {
    return (
      <View style={[styles.articleContainer, { height }]}>
        <ArticleScreen article={item} />

        <TouchableOpacity
          style={[styles.webButton, { bottom: insets.bottom + 20 }]} // Adjust position dynamically
          onPress={() => router.push({ pathname: '/article', params: { url: item.fullurl } })}>
          <Text style={styles.webButtonText}>{i18n.t('openInWeb')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().then(() => setRefreshing(false));
  }, [refetch]);

  if (status === 'error') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{i18n.t('errorLoading')}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => queryClient.invalidateQueries({ queryKey: ['articles'] })}>
          <Text style={styles.retryText}>{i18n.t('tryAgain')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={i18n.t('search')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.bookmarkButton} onPress={() => router.push('/bookmarks')}>
            <MaterialIcons name="bookmarks" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <FlashList
          data={flatArticles}
          renderItem={renderArticle}
          keyExtractor={(item) => item.pageid.toString()}
          pagingEnabled
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.1}
          estimatedItemSize={height}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>{i18n.t('loading')}</Text>
              </View>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  bookmarkButton: {
    padding: 8,
  },
  articleContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  bookmarkIconButton: {
    padding: 8,
  },
  extract: {
    fontSize: 16,
    lineHeight: 24,
  },
  webButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  webButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 10,
  },
  retryButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
  },
});

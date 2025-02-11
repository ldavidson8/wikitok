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
import { SafeAreaView } from 'react-native-safe-area-context';
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
    if (!query.trim()) return [];
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?format=json&action=query&list=search&srsearch=${encodeURIComponent(
        query,
      )}&prop=info&inprop=url&origin=*`,
    );
    const data = await response.json();

    // Transform search results to match Article type
    const articles = data.query.search.map((result: any) => ({
      ...result,
      pageid: result.pageid,
      title: result.title,
      extract: result.snippet.replace(/<\/?[^>]+(>|$)/g, ''), // Remove HTML tags
      fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
    }));

    return articles;
  },
};

const ArticleScreen = ({ article }: { article: Article }) => {
  const { bookmarks, toggleBookmark } = useBookmarkStore();
  const isBookmarked = bookmarks.some((b) => b.pageid === article.pageid);
  return (
    <View>
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
      <Text style={styles.extract} numberOfLines={25} ellipsizeMode="tail">
        {article.extract}
      </Text>
    </View>
  );
};

export default function MainScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: articles,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['articles', activeSearch],
    queryFn: ({ pageParam = 0 }) =>
      searchQuery ? WikiAPI.searchArticles(activeSearch) : WikiAPI.getRandomArticles(),
    getNextPageParam: (lastPage: Article[], pages: Article[][]) => {
      if (lastPage.length < 10) return undefined;
      return pages.length;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const handleSearch = () => {
    setActiveSearch(searchQuery.trim());
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  const flatArticles = useMemo(() => {
    if (!articles) return [];
    return articles.pages.flatMap((page) => page);
  }, [articles]);

  const renderArticle = ({ item }: { item: Article }) => {
    return (
      <View style={[styles.articleContainer, { height }]}>
        <ArticleScreen article={item} />

        <TouchableOpacity
          style={styles.webButton}
          onPress={() =>
            router.push({ pathname: '/article', params: { url: item.fullurl, title: item.title } })
          }>
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
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={i18n.t('search')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                <MaterialIcons name="clear" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <MaterialIcons name="search" size={24} color="#fff" />
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
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 15,
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexShrink: 1,
  },
  webButton: {
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

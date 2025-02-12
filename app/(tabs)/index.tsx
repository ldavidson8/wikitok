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
  Image,
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
import { translations } from '@/lib/translations';

const { height } = Dimensions.get('window');

const i18n = new I18n(translations);
i18n.locale = Localization.getLocales()[0].languageCode!;
i18n.enableFallback = true;

const WikiAPI = {
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

const ArticleScreen = ({ article }: { article: Article }) => {
  const { bookmarks, toggleBookmark } = useBookmarkStore();
  const isBookmarked = bookmarks.some((b) => b.pageid === article.pageid);

  const maxLines = Math.floor((height * 0.4) / 24);
  return (
    <View>
      {article.thumbnail?.source && (
        <Image
          source={{ uri: article.thumbnail.source }}
          style={styles.articleImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.articleHeader}>
        <Text style={styles.title}>{article.title}</Text>
        <TouchableOpacity style={styles.bookmarkIconButton} onPress={() => toggleBookmark(article)}>
          <MaterialIcons
            name={isBookmarked ? 'bookmark' : 'bookmark-border'}
            size={24}
            color="#4DB6AC"
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.extract} numberOfLines={maxLines} ellipsizeMode="tail">
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
          onEndReachedThreshold={0.2}
          onEndReached={fetchNextPage}
          estimatedItemSize={height}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
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
    backgroundColor: '#fff', // Keep the main background white
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA', // Light mint green background
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)', // Semi-transparent white
    borderRadius: 12,
    borderWidth: 0,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  searchButton: {
    backgroundColor: '#4DB6AC', // Mint green button
    padding: 10,
    borderRadius: 30,
    width: 42,
    height: 42,
    display: 'flex',
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4DB6AC',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  articleImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 12,
  },
  bookmarkIconButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: '#E0F7FA',
  },
  extract: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginTop: 8,
    fontWeight: '400',
  },
  webButton: {
    backgroundColor: '#4DB6AC',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 12,
    shadowColor: '#4DB6AC',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  webButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    backgroundColor: '#4DB6AC',
    borderRadius: 5,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
  },
});

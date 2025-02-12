import { useRouter } from 'expo-router';
import {
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { StatusBar } from 'expo-status-bar';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Article } from '@/lib/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import { WikiAPI } from '@/lib/wikiapi';
import { ArticleCard } from '@/components/ArticleCard';
import { SearchBar } from '@/components/SearchBar';
import i18n from '@/lib/i18n';

const { height } = Dimensions.get('window');

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
        <ArticleCard article={item} />
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
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          clearSearch={clearSearch}
        />

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
    backgroundColor: '#fff',
  },
  articleContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  webButton: {
    backgroundColor: '#4DB6AC',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
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

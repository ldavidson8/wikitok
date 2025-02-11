import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import { FlashList } from '@shopify/flash-list';

const { height } = Dimensions.get('window');

const translations = {
  en: {
    search: 'Search Wikipedia...',
    loading: 'Loading...',
    errorLoading: 'Error loading articles',
    tryAgain: 'Try Again',
  },
  es: {
    search: 'Buscar Wikipedia...',
    loading: 'Cargando...',
    errorLoading: 'Error al cargar artículos',
    tryAgain: 'Intentar de nuevo',
  },
  fr: {
    search: 'Rechercher Wikipédia...',
    loading: 'Chargement...',
    errorLoading: 'Erreur de chargement des articles',
    tryAgain: 'Réessayer',
  },
};

const i18n = new I18n(translations);
i18n.locale = Localization.getLocales()[0].languageCode!;
i18n.enableFallback = true;

interface Article {
  id: number;
  title: string;
  extract: string;
  image?: string;
}

const ArticleScreen = ({ article }: { article: Article }) => {
  return (
    <ScrollView contentContainerStyle={styles.articleContainer}>
      <Text style={styles.title}>{article.title}</Text>
      {article.image && <Image source={{ uri: article.image }} style={styles.articleImage} />}
      <Text style={styles.extract}>{article.extract}</Text>
    </ScrollView>
  );
};

export default function Index() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const flashListRef = useRef<FlashList<Article>>(null);

  const fetchRandomArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        'https://en.wikipedia.org/w/api.php?format=json&action=query&generator=random&grnnamespace=0&prop=extracts|pageimages&piprop=thumbnail&pithumbsize=500&exintro&explaintext&grnlimit=10&origin=*',
      );
      const data = await response.json();
      const articleList = Object.values(data.query.pages).map((page: any) => ({
        id: page.pageid,
        title: page.title,
        extract: page.extract,
        image: page.thumbnail?.source,
      }));
      setArticles((prevArticles) => [...prevArticles, ...articleList]);
    } catch (err) {
      if (err instanceof Error) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  interface SearchResult {
    pageid: number;
    title: string;
    snippet: string;
  }

  const searchArticles = async (query: string) => {
    if (!query) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?format=json&action=query&list=search&srsearch=${encodeURIComponent(query)}&prop=extracts|pageimages&piprop=thumbnail&pithumbsize=500&exintro&explaintext&origin=*`,
      );
      const data = await response.json();
      const searchResults: Article[] = data.query.search.map((result: SearchResult) => {
        const page = data.query.pages?.[result.pageid] || {};
        return {
          id: result.pageid,
          title: result.title,
          extract: result.snippet.replace(/<\/?[^>]+(>|$)/g, ''),
          image: page?.thumbnail?.source,
        };
      });
      setArticles(searchResults);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomArticles();
  }, []);

  const renderArticle = ({ item }: { item: Article }) => (
    <View style={styles.slide}>
      <ArticleScreen article={item} />
    </View>
  );

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > height);
  };

  const scrollToTop = () => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setArticles([]);
    fetchRandomArticles().finally(() => setRefreshing(false));
  }, []);

  const { height } = Dimensions.get('window');
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.t('search')}
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
          onSubmitEditing={() => searchArticles(searchQuery)}
        />
      </View>

      <FlashList
        ref={flashListRef}
        data={articles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id.toString()}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        estimatedItemSize={838}
        onEndReached={() => !searchQuery && fetchRandomArticles()}
        onEndReachedThreshold={0.1}
        onScroll={handleScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text>{i18n.t('loading')}</Text>
            </View>
          ) : null
        }
      />

      {showScrollToTop && (
        <TouchableOpacity style={styles.scrollToTopButton} onPress={scrollToTop}>
          <Text style={styles.scrollToTopText}>^</Text>
        </TouchableOpacity>
      )}
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
  },
  searchInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  slide: {
    height: height,
    overflow: 'hidden',
  },
  articleContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  articleImage: {
    width: '100%',
    height: 300,
    objectFit: 'cover',
    resizeMode: 'cover',
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  extract: {
    fontSize: 16,
    lineHeight: 24,
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
  scrollToTopButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollToTopText: {
    color: 'white',
    fontSize: 24,
  },
});

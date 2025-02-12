import React from 'react';
import { View, Text, Image, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useBookmarkStore } from '@/lib/stores/bookmarks';
import { Article } from '@/lib/types';

const { height } = Dimensions.get('window');

export const ArticleCard = ({ article }: { article: Article }) => {
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

const styles = StyleSheet.create({
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
});

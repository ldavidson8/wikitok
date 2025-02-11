import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

export default function ArticleScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();

  return (
    <View style={styles.container}>
      <WebView source={{ uri: url }} style={styles.webview} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

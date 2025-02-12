import { Dispatch, SetStateAction } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  handleSearch: () => void;
  clearSearch: () => void;
}

export const SearchBar = ({
  searchQuery,
  setSearchQuery,
  handleSearch,
  clearSearch,
}: SearchBarProps) => {
  return (
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
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
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
    backgroundColor: 'rgba(255,255,255,0.8)',
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
    backgroundColor: '#4DB6AC',
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
});

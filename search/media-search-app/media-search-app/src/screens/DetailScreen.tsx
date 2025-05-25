import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MediaItem } from '../types';

interface DetailScreenProps {
  route: {
    params: {
      mediaItem: MediaItem;
    };
  };
}

const DetailScreen: React.FC<DetailScreenProps> = ({ route }) => {
  const { mediaItem } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mediaItem.title}</Text>
      {mediaItem.type === 'image' && (
        <Image source={{ uri: mediaItem.url }} style={styles.media} />
      )}
      {mediaItem.type === 'gif' && (
        <Image source={{ uri: mediaItem.url }} style={styles.media} />
      )}
      {mediaItem.type === 'video' && (
        <Video
          source={{ uri: mediaItem.url }}
          style={styles.media}
          controls
          resizeMode="contain"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  media: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
});

export default DetailScreen;
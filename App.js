import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';

export default function App() {
  const [posts, setPosts] = useState([
    {
      id: '1',
      name: 'Alex Morgan',
      username: '@alex',
      time: '2 hours ago',
      content: 'Welcome to Vibe! 🎉 A new place to connect, share and discover amazing things.',
      likes: 24,
      liked: false,
    },
    {
      id: '2',
      name: 'Jordan Lee',
      username: '@jordan',
      time: '4 hours ago',
      content: 'Today is a new opportunity to do something amazing. Keep going! ✨',
      likes: 18,
      liked: false,
    },
  ]);

  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('Home');

  function createPost() {
    if (!message.trim()) {
      Alert.alert('Empty post', 'Write something before posting.');
      return;
    }

    const newPost = {
      id: Date.now().toString(),
      name: 'You',
      username: '@you',
      time: 'Just now',
      content: message.trim(),
      likes: 0,
      liked: false,
    };

    setPosts(currentPosts => [newPost, ...currentPosts]);
    setMessage('');
    setActiveTab('Home');
    Alert.alert('Success', 'Your post has been added!');
  }

  function toggleLike(id) {
    setPosts(currentPosts =>
      currentPosts.map(post =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.likes + (post.liked ? -1 : 1),
            }
          : post
      )
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#17102D" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.logo}>Vibe.</Text>
        <Text style={styles.headerText}>Find your people.</Text>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => setActiveTab('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.avatarText}>Y</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.welcome}>
        <Text style={styles.welcomeTitle}>What's your vibe today?</Text>
        <Text style={styles.welcomeSubtitle}>
          Share your thoughts with the community.
        </Text>
      </View>

      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'Home' && (
          <>
            <View style={styles.composer}>
              <Text style={styles.composerTitle}>Create a post</Text>
              <TextInput
                style={styles.input}
                placeholder="What's happening?"
                placeholderTextColor="#8B8499"
                multiline
                value={message}
                onChangeText={setMessage}
                maxLength={500}
                accessibilityLabel="Write a post"
              />
              <TouchableOpacity
                style={styles.postButton}
                onPress={createPost}
                accessibilityRole="button"
              >
                <Text style={styles.postButtonText}>Share post ↑</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Your Feed</Text>

            {posts.map(post => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.postAvatar}>
                    <Text style={styles.postAvatarText}>{post.name[0]}</Text>
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{post.name}</Text>
                    <Text style={styles.username}>
                      {post.username} · {post.time}
                    </Text>
                  </View>

                  <Text style={styles.more}>•••</Text>
                </View>

                <Text style={styles.postContent}>{post.content}</Text>

                <View style={styles.postActions}>
                  <TouchableOpacity
                    onPress={() => toggleLike(post.id)}
                    style={styles.actionButton}
                    accessibilityRole="button"
                    accessibilityLabel={post.liked ? 'Unlike post' : 'Like post'}
                  >
                    <Text style={styles.actionText}>
                      {post.liked ? '❤️' : '🤍'} {post.likes}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.actionText}>💬 Comment</Text>
                  <Text style={styles.actionText}>↗ Share</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'Explore' && (
          <View style={styles.emptyCard}>
            <Text style={styles.bigEmoji}>🌍</Text>
            <Text style={styles.emptyTitle}>Explore Vibe</Text>
            <Text style={styles.emptyText}>
              Discover communities, people and trending topics.
            </Text>
          </View>
        )}

        {activeTab === 'Notifications' && (
          <View style={styles.emptyCard}>
            <Text style={styles.bigEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>Notifications</Text>
            <Text style={styles.emptyText}>
              Your notifications will appear here.
            </Text>
          </View>
        )}

        {activeTab === 'Profile' && (
          <View style={styles.emptyCard}>
            <Text style={styles.bigEmoji}>👤</Text>
            <Text style={styles.emptyTitle}>Your Profile</Text>
            <Text style={styles.emptyText}>
              Your Vibe profile will be built here.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.navigation}>
        {[
          ['Home', '⌂'],
          ['Explore', '⌕'],
          ['Notifications', '♡'],
          ['Profile', '●'],
        ].map(([tab, symbol]) => (
          <TouchableOpacity
            key={tab}
            style={styles.navItem}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${tab}`}
          >
            <Text style={[styles.navIcon, activeTab === tab && styles.activeNav]}>
              {symbol}
            </Text>
            <Text style={[styles.navLabel, activeTab === tab && styles.activeNav]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FC' },
  header: {
    backgroundColor: '#17102D',
    paddingHorizontal: 22,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: { color: '#FFFFFF', fontSize: 29, fontWeight: '900' },
  headerText: { color: '#C8BCEB', marginLeft: 12, flex: 1, fontSize: 12 },
  avatar: {
    backgroundColor: '#A78BFA',
    width: 38,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#17102D', fontWeight: 'bold', fontSize: 18 },
  welcome: { backgroundColor: '#241747', padding: 22 },
  welcomeTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: 'bold' },
  welcomeSubtitle: { color: '#D4C9F0', marginTop: 7, fontSize: 13 },
  feed: { flex: 1 },
  feedContent: { padding: 15, paddingBottom: 25 },
  composer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
  },
  composerTitle: {
    color: '#241747',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    minHeight: 75,
    backgroundColor: '#F7F5FC',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    color: '#241747',
  },
  postButton: {
    backgroundColor: '#7548D8',
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
  },
  postButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  sectionTitle: {
    color: '#241747',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 13,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center' },
  postAvatar: {
    width: 42,
    height: 42,
    backgroundColor: '#E8DFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: { color: '#7548D8', fontWeight: 'bold', fontSize: 18 },
  userInfo: { flex: 1, marginLeft: 10 },
  userName: { color: '#241747', fontWeight: 'bold' },
  username: { color: '#898399', fontSize: 11, marginTop: 3 },
  more: { color: '#898399', fontSize: 18 },
  postContent: {
    color: '#393347',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 18,
  },
  postActions: {
    borderTopWidth: 1,
    borderTopColor: '#F0EDF6',
    paddingTop: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: { paddingRight: 5 },
  actionText: { color: '#655B78', fontSize: 12 },
  navigation: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECE8F4',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  navItem: { alignItems: 'center', minWidth: 65 },
  navIcon: { fontSize: 22, color: '#938BA3' },
  navLabel: { fontSize: 10, color: '#938BA3', marginTop: 3 },
  activeNav: { color: '#7548D8', fontWeight: 'bold' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 35,
    alignItems: 'center',
    marginTop: 20,
  },
  bigEmoji: { fontSize: 45, marginBottom: 15 },
  emptyTitle: { color: '#241747', fontSize: 21, fontWeight: 'bold' },
  emptyText: {
    color: '#898399',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },
});

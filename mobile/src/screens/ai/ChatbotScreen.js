import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import {
  TextInput,
  IconButton,
  Surface,
  Text,
  ActivityIndicator,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatbotScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  // Initial welcome message
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hello! I am your Lab Assistant AI. I can help you find equipment, check maintenance schedules, or answer questions about lab safety. How can I help you today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    // --- MOCK API CALL (Replace with your actual backend call) ---
    try {
      // Simulate network delay
      setTimeout(() => {
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          text: "I'm processing your request. (This is a placeholder response until the backend AI is connected).",
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
    // -----------------------------------------------------------
  };

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (flatListRef.current) {
      setTimeout(
        () => flatListRef.current.scrollToEnd({ animated: true }),
        100
      );
    }
  }, [messages, loading]);

  const renderMessage = ({ item }) => {
    const isUser = item.sender === "user";
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <MaterialCommunityIcons name="robot" size={20} color="white" />
          </View>
        )}
        <Surface
          style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
          elevation={1}
        >
          <Text style={[styles.msgText, isUser && styles.userMsgText]}>
            {item.text}
          </Text>
        </Surface>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <View>
          <Text style={styles.headerTitle}>Lab AI Assistant</Text>
          <Text style={styles.headerSubtitle}>Always online</Text>
        </View>
      </View>

      {/* Chat Area */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        style={{ flex: 1 }}
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            mode="outlined"
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            style={styles.textInput}
            outlineColor="#E5E7EB"
            activeOutlineColor="#2563EB"
            right={
              <TextInput.Icon
                icon="send"
                color={inputText.trim() ? "#2563EB" : "#9CA3AF"}
                disabled={!inputText.trim() || loading}
                onPress={sendMessage}
              />
            }
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#10B981", // Green for online status
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  aiRow: {
    justifyContent: "flex-start",
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },
  userMsgText: {
    color: "white",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  loadingText: {
    marginLeft: 8,
    color: "#6B7280",
    fontSize: 12,
  },
  inputContainer: {
    padding: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  textInput: {
    backgroundColor: "white",
    maxHeight: 100,
  },
});

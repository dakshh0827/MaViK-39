import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
} from "react-native";
import {
  TextInput,
  IconButton,
  Text,
  ActivityIndicator,
  SegmentedButtons,
  Button,
  Chip,
  useTheme,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useChatbotStore } from "../../stores/chatbotStore";
import VoiceInput from "../../components/common/VoiceInput";

export default function ChatbotScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const flatListRef = useRef(null);

  const [viewMode, setViewMode] = useState("chat");
  const [inputText, setInputText] = useState("");

  const {
    messages,
    sendMessage,
    isLoading: isChatLoading,
    clearHistory,
    generateBriefing,
    initSession,
  } = useChatbotStore();

  const [briefingResponse, setBriefingResponse] = useState(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  useEffect(() => {
    initSession();
  }, []);

  useEffect(() => {
    if (viewMode === "chat" && flatListRef.current) {
      setTimeout(
        () => flatListRef.current.scrollToEnd({ animated: true }),
        200
      );
    }
  }, [messages, viewMode, isChatLoading]);

  const handleSend = async () => {
    if (!inputText.trim() || isChatLoading) return;
    const text = inputText;
    setInputText("");
    Keyboard.dismiss();
    await sendMessage(text);
  };

  const handleVoiceTranscription = (text) => {
    setInputText((prev) => (prev ? `${prev} ${text}` : text));
  };

  const handleQuickAction = (action) => {
    setInputText("");
    sendMessage(action);
  };

  const handleGenerateBriefing = async () => {
    setIsBriefingLoading(true);
    setBriefingResponse(null);
    const prompt =
      "Give me the detailed daily report of all the CNC_LATHE, Laser_Engraver, Manual_Arc_Welder machines for today";
    try {
      const response = await generateBriefing(prompt);
      setBriefingResponse(response);
    } catch (error) {
      setBriefingResponse(
        "Failed to generate briefing. Please check connection."
      );
    } finally {
      setIsBriefingLoading(false);
    }
  };

  const clearBriefing = () => {
    setBriefingResponse(null);
  };

  const renderMessage = ({ item }) => {
    // Debugging: Check your terminal to see the actual structure of 'item'
    // console.log("Message Item:", item);

    // Improved check: handles capitalization and checks for a direct 'isUser' flag
    const isUser =
      item.role?.toLowerCase() === "user" ||
      item.sender?.toLowerCase() === "user" ||
      item.isUser === true;

    // Note: added item.response check. Usually only the Bot has a 'response' key.
    // If 'text' exists but no role is defined, we might assume it's user,
    // but it's safer to fix the data source.

    const text = item.content || item.message || item.text || item.response;

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="robot"
              size={18}
              color={theme.colors.onSecondaryContainer}
            />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser
              ? {
                  backgroundColor: theme.colors.primary,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  borderBottomLeftRadius: 20,
                  borderBottomRightRadius: 2,
                }
              : {
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  borderBottomRightRadius: 20,
                  borderBottomLeftRadius: 2,
                },
          ]}
        >
          <Text
            style={[
              styles.msgText,
              isUser ? { color: "white" } : { color: "#1F2937" },
            ]}
          >
            {text}
          </Text>
        </View>

        {isUser && (
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.primaryContainer, marginLeft: 8 },
            ]}
          >
            <MaterialCommunityIcons
              name="account"
              size={18}
              color={theme.colors.onPrimaryContainer}
            />
          </View>
        )}
      </View>
    );
  };
  const quickActions = [
    "Show equipment status",
    "Recent alerts",
    "Maintenance schedule",
    "Analytics overview",
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <View>
            <Text style={styles.headerTitle}>AI Ops Center</Text>
            <Text style={styles.headerSubtitle}>Powered by MaViK-39</Text>
          </View>
          <View style={{ flex: 1 }} />
          <IconButton
            icon="delete-outline"
            iconColor={theme.colors.error}
            size={22}
            onPress={viewMode === "chat" ? clearHistory : clearBriefing}
          />
        </View>

        <View style={styles.tabContainer}>
          <SegmentedButtons
            value={viewMode}
            onValueChange={setViewMode}
            buttons={[
              {
                value: "chat",
                label: "Assistant",
                icon: "message-text-outline",
              },
              {
                value: "briefing",
                label: "Daily Briefing",
                icon: "file-chart-outline",
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.contentArea}>
        {viewMode === "chat" && (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View
                    style={[
                      styles.largeIcon,
                      { backgroundColor: theme.colors.secondaryContainer },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="robot"
                      size={40}
                      color={theme.colors.onSecondaryContainer}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>How can I help?</Text>
                  <Text style={styles.emptySubtitle}>
                    Ask about status, schedules, or alerts.
                  </Text>

                  <View style={styles.quickActionContainer}>
                    {quickActions.map((action, index) => (
                      <Chip
                        key={index}
                        style={styles.chip}
                        onPress={() => handleQuickAction(action)}
                        icon="lightning-bolt-outline"
                      >
                        {action}
                      </Chip>
                    ))}
                  </View>
                </View>
              }
            />

            {isChatLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size={16} color={theme.colors.primary} />
                <Text style={styles.loadingText}>
                  MaViK-39 is processing...
                </Text>
              </View>
            )}

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <TextInput
                    mode="outlined"
                    placeholder="Type your message..."
                    value={inputText}
                    onChangeText={setInputText}
                    style={styles.textInput}
                    outlineStyle={{ borderRadius: 24, paddingRight: 50 }}
                    right={
                      <TextInput.Icon
                        icon="send"
                        color={
                          inputText.trim() ? theme.colors.primary : "#9CA3AF"
                        }
                        disabled={!inputText.trim() || isChatLoading}
                        onPress={handleSend}
                      />
                    }
                  />
                  <View style={styles.voiceBtnContainer}>
                    <VoiceInput
                      onTranscriptionComplete={handleVoiceTranscription}
                      disabled={isChatLoading}
                    />
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </>
        )}

        {viewMode === "briefing" && (
          <View style={styles.briefingContainer}>
            <ScrollView contentContainerStyle={styles.briefingScroll}>
              {!briefingResponse && !isBriefingLoading ? (
                <View style={styles.emptyState}>
                  <View
                    style={[styles.largeIcon, { backgroundColor: "#DBEAFE" }]}
                  >
                    <MaterialCommunityIcons
                      name="chart-line"
                      size={40}
                      color="#2563EB"
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Daily Report Ready</Text>
                  <Text style={styles.emptySubtitle}>
                    Generate a summary for CNC Lathe, Laser Engraver, and
                    Welding units.
                  </Text>
                </View>
              ) : (
                <View style={styles.briefingCard}>
                  {isBriefingLoading ? (
                    <View style={{ padding: 40, alignItems: "center" }}>
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                      <Text style={{ marginTop: 15, color: "#6B7280" }}>
                        Generating Analytics Report...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.briefingText}>{briefingResponse}</Text>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.briefingFooter}>
              <Button
                mode="contained"
                onPress={handleGenerateBriefing}
                loading={isBriefingLoading}
                disabled={isBriefingLoading}
                icon="play-circle-outline"
                style={{ borderRadius: 8 }}
                contentStyle={{ height: 48 }}
              >
                Generate Daily Report
              </Button>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  contentArea: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    maxWidth: "100%",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  aiRow: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  bubble: {
    maxWidth: "75%",
    padding: 12,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    justifyContent: "center",
  },
  loadingText: {
    marginLeft: 8,
    color: "#6B7280",
    fontSize: 12,
  },
  inputWrapper: {
    padding: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "white",
    maxHeight: 100,
  },
  voiceBtnContainer: {
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  largeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 250,
    marginBottom: 24,
  },
  quickActionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    maxWidth: 300,
  },
  chip: {
    backgroundColor: "white",
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },
  briefingContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  briefingScroll: {
    padding: 16,
    flexGrow: 1,
  },
  briefingCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  briefingText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 24,
  },
  briefingFooter: {
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
});

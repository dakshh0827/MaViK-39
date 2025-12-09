import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Alert, Platform } from "react-native";
import { IconButton, ActivityIndicator, useTheme } from "react-native-paper";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { WebView } from "react-native-webview";
import { transcriptionHtml } from "../../lib/transcriptionPolyfill";

export default function VoiceInput({
  onTranscriptionComplete,
  disabled = false,
}) {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const recordingRef = useRef(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
      } catch (e) {
        console.error("Permission request failed", e);
      }
    })();
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Could not start recording.");
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    setIsRecording(false);
    setIsProcessing(true);

    try {
      console.log("Stopping recording...");
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (!uri) throw new Error("No recording URI found");

      // Read file as Base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Send to WebView for transcription
      console.log("Sending audio to Whisper engine...");
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "transcribe",
            audio: base64Audio,
          })
        );
      } else {
        throw new Error("Transcription engine not ready");
      }
    } catch (err) {
      console.error("Processing error:", err);
      Alert.alert("Error", "Failed to process audio.");
      setIsProcessing(false);
    } finally {
      recordingRef.current = null;
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "success") {
        console.log("Transcription success:", data.text);
        if (onTranscriptionComplete) {
          onTranscriptionComplete(data.text);
        }
        setIsProcessing(false);
      } else if (data.type === "error") {
        console.error("Whisper Error:", data.message);
        Alert.alert("Transcription Failed", data.message);
        setIsProcessing(false);
      } else if (data.type === "log") {
        console.log("[Whisper Worker]:", data.message);
      }
    } catch (err) {
      console.error("Failed to parse WebView message", err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Hidden WebView 
        baseUrl="https://localhost/" creates a 'Secure Context', allowing Cache API to work.
      */}
      <View style={{ height: 0, width: 0, overflow: "hidden" }}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{
            html: transcriptionHtml,
            baseUrl: "https://localhost/",
          }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          mixedContentMode="always"
        />
      </View>

      <View style={styles.buttonWrapper}>
        {isProcessing ? (
          <ActivityIndicator size={24} color={theme.colors.primary} />
        ) : (
          <IconButton
            icon={isRecording ? "stop" : "microphone"}
            mode={isRecording ? "contained" : "outlined"}
            containerColor={isRecording ? theme.colors.error : undefined}
            iconColor={isRecording ? "white" : theme.colors.primary}
            size={24}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            style={styles.iconButton}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  buttonWrapper: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButton: {
    margin: 0,
  },
});

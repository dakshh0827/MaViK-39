import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput as RNTextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { Text, Button, Title, Surface } from "react-native-paper";
import { useAuthStore } from "../../context/useAuthStore";

// Theme Colors matching Web App (Blue-900)
const COLORS = {
  primary: "#1e3a8a", // blue-900
  background: "#eff6ff", // blue-50
  surface: "#ffffff",
  text: "#1e3a8a",
  textGray: "#4b5563",
  inputBorder: "#cbd5e1",
  inputFocus: "#3b82f6",
};

export default function VerifyEmailScreen({ route, navigation }) {
  const { verifyEmail, resendOtp } = useAuthStore();
  const email = route.params?.email || "";

  // State
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs for inputs to manage focus
  const inputRefs = useRef([]);

  // Timer Logic
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      Alert.alert("Error", "Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(email, otpString);
      Alert.alert("Success", "Email verified successfully!", [
        { text: "Login Now", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error) {
      Alert.alert(
        "Verification Failed",
        error.msg || error.message || "Invalid OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp(email);
      setCountdown(60);
      setCanResend(false);
      Alert.alert("Sent", "A new code has been sent to your email.");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to resend OTP");
    }
  };

  const handleChangeText = (text, index) => {
    if (!/^\d*$/.test(text)) return; // Only numbers

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace to focus previous input
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Title style={styles.title}>Verify Email</Title>
          <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Card */}
        <Surface style={styles.card}>
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <RNTextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  {
                    borderColor: digit ? COLORS.inputFocus : COLORS.inputBorder,
                    backgroundColor: digit ? "#eff6ff" : "#f8fafc",
                  },
                ]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                selectTextOnFocus
                selectionColor={COLORS.primary}
              />
            ))}
          </View>

          <Button
            mode="contained"
            onPress={handleVerify}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={{ fontSize: 16, fontWeight: "bold" }}
            contentStyle={{ height: 50 }}
            theme={{ colors: { primary: COLORS.primary } }}
          >
            Verify Email
          </Button>

          <View style={styles.resendContainer}>
            {canResend ? (
              <Button
                mode="text"
                onPress={handleResend}
                labelStyle={{ fontWeight: "bold", color: COLORS.primary }}
              >
                Resend Code
              </Button>
            ) : (
              <Text style={{ color: COLORS.textGray }}>
                Resend code in{" "}
                <Text style={{ fontWeight: "bold", color: COLORS.primary }}>
                  {countdown}s
                </Text>
              </Text>
            )}
          </View>
        </Surface>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: 20,
  },
  header: { marginBottom: 30, alignItems: "center" },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 10,
  },
  subtitle: { color: COLORS.textGray, fontSize: 16 },
  emailText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 5,
  },

  card: {
    backgroundColor: COLORS.surface,
    padding: 30,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: "center",
  },

  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    color: COLORS.primary,
  },

  button: { width: "100%", borderRadius: 8, backgroundColor: COLORS.primary },
  resendContainer: { marginTop: 25 },
});

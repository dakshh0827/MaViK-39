import React, { useState } from "react";
import { View, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { TextInput, Button, Text, Title, Surface } from "react-native-paper";
import { useAuthStore } from "../../context/useAuthStore";

// Theme Colors matching Web App (Blue-900)
const COLORS = {
  primary: "#1e3a8a", // blue-900
  background: "#eff6ff", // blue-50
  surface: "#ffffff",
  text: "#1e3a8a",
  textGray: "#4b5563",
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);

    if (!success) {
      Alert.alert("Login Failed", "Check your credentials.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Title style={styles.title}>MaViK-39</Title>
        <Text style={styles.subtitle}>Equipment Monitoring System</Text>
      </View>

      {/* Login Card */}
      <Surface style={styles.card}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          outlineColor="#cbd5e1"
          activeOutlineColor={COLORS.primary}
          left={<TextInput.Icon icon="email" color={COLORS.textGray} />}
          style={styles.input}
          theme={{ colors: { primary: COLORS.primary } }}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          mode="outlined"
          outlineColor="#cbd5e1"
          activeOutlineColor={COLORS.primary}
          left={<TextInput.Icon icon="lock" color={COLORS.textGray} />}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword(!showPassword)}
              color={COLORS.textGray}
            />
          }
          style={styles.input}
          theme={{ colors: { primary: COLORS.primary } }}
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
          labelStyle={{ fontSize: 16, fontWeight: "bold" }}
          contentStyle={{ height: 50 }}
          theme={{ colors: { primary: COLORS.primary } }}
        >
          Login
        </Button>

        <View style={styles.footer}>
          <Text style={{ color: COLORS.textGray }}>
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </Surface>
    </View>
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
    textAlign: "center",
    fontWeight: "bold",
    color: COLORS.text,
  },
  subtitle: {
    textAlign: "center",
    color: COLORS.textGray,
    fontSize: 16,
    marginTop: 5,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: 25,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  input: { marginBottom: 15, backgroundColor: COLORS.surface },
  button: { marginTop: 10, borderRadius: 8, backgroundColor: COLORS.primary },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  link: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
});

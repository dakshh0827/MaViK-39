import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  Title,
  HelperText,
  Menu,
  Surface,
  ActivityIndicator,
} from "react-native-paper";
import { useAuthStore } from "../../context/useAuthStore";
import { useInstituteStore } from "../../context/useInstituteStore";

// Constants matching Web App
const departments = [
  "FITTER_MANUFACTURING",
  "ELECTRICAL_ENGINEERING",
  "WELDING_FABRICATION",
  "TOOL_DIE_MAKING",
  "ADDITIVE_MANUFACTURING",
  "SOLAR_INSTALLER_PV",
  "MATERIAL_TESTING_QUALITY",
  "ADVANCED_MANUFACTURING_CNC",
  "AUTOMOTIVE_MECHANIC",
];

const DEPARTMENT_DISPLAY_NAMES = {
  FITTER_MANUFACTURING: "Fitter/Manufacturing",
  ELECTRICAL_ENGINEERING: "Electrical Engineering",
  WELDING_FABRICATION: "Welding & Fabrication",
  TOOL_DIE_MAKING: "Tool & Die Making",
  ADDITIVE_MANUFACTURING: "Additive Manufacturing",
  SOLAR_INSTALLER_PV: "Solar Installer (PV)",
  MATERIAL_TESTING_QUALITY: "Material Testing/Quality",
  ADVANCED_MANUFACTURING_CNC: "Advanced Manufacturing/CNC",
  AUTOMOTIVE_MECHANIC: "Automotive/Mechanic",
};

// Theme Colors
const COLORS = {
  primary: "#1e3a8a", // blue-900
  background: "#eff6ff", // blue-50
  surface: "#ffffff",
  text: "#1e3a8a",
  textGray: "#4b5563",
  accent: "#3b82f6", // blue-500
};

export default function SignupScreen({ navigation }) {
  const register = useAuthStore((state) => state.register);
  const {
    institutes,
    fetchInstitutes,
    isLoading: institutesLoading,
  } = useInstituteStore();

  // Fetch institutes on mount
  useEffect(() => {
    fetchInstitutes();
  }, []);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "TRAINER",
    instituteId: "",
    department: "",
    labId: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Menus Visibility State
  const [visibleRole, setVisibleRole] = useState(false);
  const [visibleDept, setVisibleDept] = useState(false);
  const [visibleInst, setVisibleInst] = useState(false);

  // Layout state for dropdown width
  const [inputWidth, setInputWidth] = useState(0);

  const handleChange = (name, value) => {
    let processedValue = value;
    if (name === "email") processedValue = value.trim();
    setFormData({ ...formData, [name]: processedValue });
  };

  const handleSignup = async () => {
    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert("Invalid Input", "Please enter a valid email address");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Invalid Input", "Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      Alert.alert(
        "Invalid Input",
        "Password must be at least 8 characters long"
      );
      return;
    }

    if (formData.role === "LAB_MANAGER" || formData.role === "TRAINER") {
      if (!formData.instituteId || !formData.department || !formData.labId) {
        Alert.alert(
          "Missing Fields",
          "Institute, Department, and Lab ID are required for this role."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const cleanData = { ...registerData };

      // Remove irrelevant fields for Policy Maker
      if (formData.role === "POLICY_MAKER") {
        delete cleanData.instituteId;
        delete cleanData.department;
        delete cleanData.labId;
      }

      await register(cleanData);

      Alert.alert(
        "Account Created",
        "Please check your email for the verification code.",
        [
          {
            text: "Verify Now",
            onPress: () =>
              navigation.navigate("VerifyEmail", { email: formData.email }),
          },
        ]
      );
    } catch (error) {
      const errMsg = error.msg || error.message || "Please check your inputs.";
      Alert.alert("Registration Failed", errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Title style={styles.title}>Create Account</Title>
          <Text style={styles.subtitle}>
            Join the IoT Equipment Monitoring Platform
          </Text>
        </View>

        {/* Form Card */}
        <Surface style={styles.card}>
          {/* Name Fields */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <TextInput
                label="First Name"
                value={formData.firstName}
                onChangeText={(t) => handleChange("firstName", t)}
                mode="outlined"
                outlineColor="#cbd5e1"
                activeOutlineColor={COLORS.primary}
                style={styles.input}
                theme={{ colors: { primary: COLORS.primary } }}
              />
            </View>
            <View style={[styles.halfInput, { marginLeft: 10 }]}>
              <TextInput
                label="Last Name"
                value={formData.lastName}
                onChangeText={(t) => handleChange("lastName", t)}
                mode="outlined"
                outlineColor="#cbd5e1"
                activeOutlineColor={COLORS.primary}
                style={styles.input}
                theme={{ colors: { primary: COLORS.primary } }}
              />
            </View>
          </View>

          <TextInput
            label="Email"
            value={formData.email}
            onChangeText={(t) => handleChange("email", t)}
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
            label="Phone"
            value={formData.phone}
            onChangeText={(t) => handleChange("phone", t)}
            mode="outlined"
            keyboardType="phone-pad"
            outlineColor="#cbd5e1"
            activeOutlineColor={COLORS.primary}
            left={<TextInput.Icon icon="phone" color={COLORS.textGray} />}
            style={styles.input}
            theme={{ colors: { primary: COLORS.primary } }}
          />

          {/* Role Dropdown */}
          <Menu
            visible={visibleRole}
            onDismiss={() => setVisibleRole(false)}
            contentStyle={{ width: inputWidth }}
            anchor={
              <TouchableOpacity
                onPress={() => setVisibleRole(true)}
                onLayout={(e) => setInputWidth(e.nativeEvent.layout.width)}
              >
                <View pointerEvents="none">
                  <TextInput
                    label="Role"
                    value={formData.role.replace("_", " ")}
                    mode="outlined"
                    editable={false}
                    outlineColor="#cbd5e1"
                    activeOutlineColor={COLORS.primary}
                    right={
                      <TextInput.Icon
                        icon="chevron-down"
                        color={COLORS.textGray}
                      />
                    }
                    style={styles.input}
                    theme={{ colors: { primary: COLORS.primary } }}
                  />
                </View>
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => {
                handleChange("role", "TRAINER");
                setVisibleRole(false);
              }}
              title="Trainer"
            />
            <Menu.Item
              onPress={() => {
                handleChange("role", "LAB_MANAGER");
                setVisibleRole(false);
              }}
              title="Lab Manager"
            />
            <Menu.Item
              onPress={() => {
                handleChange("role", "POLICY_MAKER");
                setVisibleRole(false);
              }}
              title="Policy Maker"
            />
          </Menu>

          <HelperText
            type="info"
            visible={true}
            style={{ marginBottom: 5, color: COLORS.textGray }}
          >
            {formData.role === "TRAINER" &&
              "Trainers view equipment in their assigned lab."}
            {formData.role === "LAB_MANAGER" &&
              "Managers oversee all labs in their department."}
            {formData.role === "POLICY_MAKER" &&
              "Policy Makers have system-wide access."}
          </HelperText>

          {/* Conditional Fields */}
          {(formData.role === "LAB_MANAGER" || formData.role === "TRAINER") && (
            <View style={styles.conditionalSection}>
              {/* Institute Dropdown (Dynamic) */}
              <Menu
                visible={visibleInst}
                onDismiss={() => setVisibleInst(false)}
                contentStyle={{ width: inputWidth }}
                anchor={
                  <TouchableOpacity onPress={() => setVisibleInst(true)}>
                    <View pointerEvents="none">
                      <TextInput
                        label={institutesLoading ? "Loading..." : "Institute"}
                        value={
                          institutes.find(
                            (i) =>
                              i.instituteId === formData.instituteId ||
                              i.id === formData.instituteId
                          )?.name ||
                          (institutesLoading
                            ? "Loading Institutes..."
                            : "Select Institute")
                        }
                        mode="outlined"
                        editable={false}
                        outlineColor="#cbd5e1"
                        activeOutlineColor={COLORS.primary}
                        left={
                          <TextInput.Icon
                            icon="office-building"
                            color={COLORS.textGray}
                          />
                        }
                        right={
                          institutesLoading ? (
                            <TextInput.Icon
                              icon={() => <ActivityIndicator size={20} />}
                            />
                          ) : (
                            <TextInput.Icon
                              icon="chevron-down"
                              color={COLORS.textGray}
                            />
                          )
                        }
                        style={styles.input}
                        theme={{ colors: { primary: COLORS.primary } }}
                      />
                    </View>
                  </TouchableOpacity>
                }
              >
                {institutes.map((inst) => (
                  <Menu.Item
                    key={inst.id || inst.instituteId}
                    onPress={() => {
                      handleChange("instituteId", inst.instituteId || inst.id);
                      setVisibleInst(false);
                    }}
                    title={inst.name}
                  />
                ))}
                {institutes.length === 0 && !institutesLoading && (
                  <Menu.Item title="No institutes found" disabled />
                )}
              </Menu>

              {/* Department Dropdown */}
              <Menu
                visible={visibleDept}
                onDismiss={() => setVisibleDept(false)}
                contentStyle={{ width: inputWidth }}
                anchor={
                  <TouchableOpacity onPress={() => setVisibleDept(true)}>
                    <View pointerEvents="none">
                      <TextInput
                        label="Department"
                        value={
                          DEPARTMENT_DISPLAY_NAMES[formData.department] ||
                          "Select Department"
                        }
                        mode="outlined"
                        editable={false}
                        outlineColor="#cbd5e1"
                        activeOutlineColor={COLORS.primary}
                        left={
                          <TextInput.Icon
                            icon="book-open-variant"
                            color={COLORS.textGray}
                          />
                        }
                        right={
                          <TextInput.Icon
                            icon="chevron-down"
                            color={COLORS.textGray}
                          />
                        }
                        style={styles.input}
                        theme={{ colors: { primary: COLORS.primary } }}
                      />
                    </View>
                  </TouchableOpacity>
                }
              >
                <ScrollView style={{ maxHeight: 200 }}>
                  {departments.map((dept) => (
                    <Menu.Item
                      key={dept}
                      onPress={() => {
                        handleChange("department", dept);
                        setVisibleDept(false);
                      }}
                      title={DEPARTMENT_DISPLAY_NAMES[dept]}
                    />
                  ))}
                </ScrollView>
              </Menu>

              <TextInput
                label="Lab ID"
                placeholder="e.g., ITI-PUSA-MECH-01"
                value={formData.labId}
                onChangeText={(t) => handleChange("labId", t)}
                mode="outlined"
                outlineColor="#cbd5e1"
                activeOutlineColor={COLORS.primary}
                left={<TextInput.Icon icon="pound" color={COLORS.textGray} />}
                style={styles.input}
                theme={{ colors: { primary: COLORS.primary } }}
              />
            </View>
          )}

          {/* Password Fields */}
          <TextInput
            label="Password"
            value={formData.password}
            onChangeText={(t) => handleChange("password", t)}
            mode="outlined"
            secureTextEntry={!showPassword}
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

          <TextInput
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(t) => handleChange("confirmPassword", t)}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            outlineColor="#cbd5e1"
            activeOutlineColor={COLORS.primary}
            left={<TextInput.Icon icon="lock-check" color={COLORS.textGray} />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? "eye-off" : "eye"}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                color={COLORS.textGray}
              />
            }
            style={styles.input}
            theme={{ colors: { primary: COLORS.primary } }}
          />

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSignup}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={{ fontSize: 16, fontWeight: "bold" }}
            contentStyle={{ height: 50 }}
            theme={{ colors: { primary: COLORS.primary } }}
          >
            Create Account
          </Button>

          {/* Login Redirect */}
          <View style={styles.footer}>
            <Text style={{ color: COLORS.textGray }}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </Surface>
        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    marginTop: 40,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  header: { marginBottom: 20, alignItems: "center" },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 5,
  },
  subtitle: { textAlign: "center", color: COLORS.textGray, fontSize: 16 },

  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  row: { flexDirection: "row", justifyContent: "space-between" },
  halfInput: { flex: 1 },
  input: { marginBottom: 12, backgroundColor: COLORS.surface, fontSize: 14 },

  conditionalSection: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  button: { marginTop: 15, borderRadius: 8, backgroundColor: COLORS.primary },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 25 },
  link: { color: COLORS.primary, fontWeight: "bold" },
});

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import {
  Avatar,
  Title,
  Caption,
  Button,
  List,
  TextInput,
  Text,
  Divider,
  useTheme,
  IconButton,
  Chip,
} from "react-native-paper";
import { useAuthStore } from "../../context/useAuthStore";

// Theme Colors matching Web App (Blue-900)
const COLORS = {
  primary: "#1e3a8a", // blue-900
  secondary: "#1e40af", // blue-800
  background: "#eff6ff", // blue-50
  surface: "#ffffff",
  text: "#1e3a8a",
  textGray: "#4b5563",
  accent: "#3b82f6", // blue-500
  lightBlue: "#dbeafe", // blue-100
  error: "#ef4444",
};

export default function ProfileScreen() {
  const { user, logout, updateProfile, changePassword } = useAuthStore();

  // Mocking report store for UI demonstration
  const generateDailyReport = async () => ({ data: { pdfUrl: "mock.pdf" } });
  const generateWeeklyReport = async () => ({ data: { pdfUrl: "mock.pdf" } });
  const generateMonthlyReport = async () => ({ data: { pdfUrl: "mock.pdf" } });
  const isLoadingReport = false;

  // --- State Management ---
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'reports' | 'help'

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
  });

  // Password Change State
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passData, setPassData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [secureTextEntry, setSecureTextEntry] = useState({
    current: true,
    new: true,
    confirm: true,
  });

  // Report State
  const [reportType, setReportType] = useState("daily");
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(
    new Date().getFullYear().toString()
  );

  // Help Section State
  const [feedbackText, setFeedbackText] = useState("");

  // --- Helpers ---
  const isManagerOrAbove =
    user?.role === "LAB_MANAGER" || user?.role === "POLICY_MAKER";
  const isTrainer = user?.role === "TRAINER";

  const handleProfileUpdate = async () => {
    try {
      await updateProfile(profileData);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update profile");
    }
  };

  const handlePasswordChange = async () => {
    if (passData.new !== passData.confirm) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    try {
      await changePassword(passData.current, passData.new);
      setIsChangingPass(false);
      setPassData({ current: "", new: "", confirm: "" });
      Alert.alert("Success", "Password changed successfully!");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleGenerateReport = async () => {
    try {
      if (reportType === "daily") await generateDailyReport(reportDate, true);
      else if (reportType === "weekly")
        await generateWeeklyReport(reportDate, true);
      else await generateMonthlyReport(parseInt(reportYear), reportMonth, true);

      Alert.alert(
        "Success",
        `${reportType.toUpperCase()} Report generated! (PDF Download simulation)`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to generate report");
    }
  };

  // --- Render Sections ---

  const renderProfileTab = () => (
    <View style={styles.sectionContainer}>
      {/* Read-Only Info */}
      {!isEditing && (
        <View style={styles.card}>
          <List.Item
            title="Institute"
            description={user?.institute?.name || "Not assigned"}
            left={(props) => (
              <List.Icon
                {...props}
                icon="office-building"
                color={COLORS.textGray}
              />
            )}
            titleStyle={{ color: COLORS.text }}
          />
          <Divider />
          <List.Item
            title="Department"
            description={user?.department || "General"}
            left={(props) => (
              <List.Icon
                {...props}
                icon="book-open-variant"
                color={COLORS.textGray}
              />
            )}
            titleStyle={{ color: COLORS.text }}
          />
          <Divider />
          <List.Item
            title="Phone"
            description={user?.phone || "Not set"}
            left={(props) => (
              <List.Icon {...props} icon="phone" color={COLORS.textGray} />
            )}
            titleStyle={{ color: COLORS.text }}
          />
          <Button
            mode="contained"
            onPress={() => setIsEditing(true)}
            style={styles.mt2}
            theme={{ colors: { primary: COLORS.primary } }}
          >
            Edit Profile
          </Button>
        </View>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <View style={styles.card}>
          <Title style={styles.cardTitle}>Edit Personal Info</Title>
          <TextInput
            label="First Name"
            value={profileData.firstName}
            onChangeText={(t) =>
              setProfileData({ ...profileData, firstName: t })
            }
            style={styles.input}
            mode="outlined"
            activeOutlineColor={COLORS.primary}
            theme={{ colors: { primary: COLORS.primary } }}
          />
          <TextInput
            label="Last Name"
            value={profileData.lastName}
            onChangeText={(t) =>
              setProfileData({ ...profileData, lastName: t })
            }
            style={styles.input}
            mode="outlined"
            activeOutlineColor={COLORS.primary}
            theme={{ colors: { primary: COLORS.primary } }}
          />
          <TextInput
            label="Phone"
            value={profileData.phone}
            onChangeText={(t) => setProfileData({ ...profileData, phone: t })}
            keyboardType="phone-pad"
            style={styles.input}
            mode="outlined"
            activeOutlineColor={COLORS.primary}
            theme={{ colors: { primary: COLORS.primary } }}
          />
          <View style={styles.rowBtn}>
            <Button
              mode="outlined"
              onPress={() => setIsEditing(false)}
              style={{ flex: 1, marginRight: 8, borderColor: COLORS.primary }}
              textColor={COLORS.primary}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleProfileUpdate}
              style={{ flex: 1 }}
              theme={{ colors: { primary: COLORS.primary } }}
            >
              Save
            </Button>
          </View>
        </View>
      )}

      {/* Password Change */}
      <View style={[styles.card, styles.mt3]}>
        <Title style={styles.cardTitle}>Security</Title>
        {!isChangingPass ? (
          <Button
            mode="outlined"
            icon="lock"
            onPress={() => setIsChangingPass(true)}
            style={{ borderColor: COLORS.primary }}
            textColor={COLORS.primary}
          >
            Change Password
          </Button>
        ) : (
          <View>
            <TextInput
              label="Current Password"
              value={passData.current}
              secureTextEntry={secureTextEntry.current}
              right={
                <TextInput.Icon
                  icon="eye"
                  color={COLORS.textGray}
                  onPress={() =>
                    setSecureTextEntry((p) => ({ ...p, current: !p.current }))
                  }
                />
              }
              onChangeText={(t) => setPassData({ ...passData, current: t })}
              style={styles.input}
              mode="outlined"
              activeOutlineColor={COLORS.primary}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            <TextInput
              label="New Password"
              value={passData.new}
              secureTextEntry={secureTextEntry.new}
              right={
                <TextInput.Icon
                  icon="eye"
                  color={COLORS.textGray}
                  onPress={() =>
                    setSecureTextEntry((p) => ({ ...p, new: !p.new }))
                  }
                />
              }
              onChangeText={(t) => setPassData({ ...passData, new: t })}
              style={styles.input}
              mode="outlined"
              activeOutlineColor={COLORS.primary}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            <TextInput
              label="Confirm Password"
              value={passData.confirm}
              secureTextEntry={secureTextEntry.confirm}
              right={
                <TextInput.Icon
                  icon="eye"
                  color={COLORS.textGray}
                  onPress={() =>
                    setSecureTextEntry((p) => ({ ...p, confirm: !p.confirm }))
                  }
                />
              }
              onChangeText={(t) => setPassData({ ...passData, confirm: t })}
              style={styles.input}
              mode="outlined"
              activeOutlineColor={COLORS.primary}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            <View style={styles.rowBtn}>
              <Button
                mode="text"
                onPress={() => setIsChangingPass(false)}
                style={{ flex: 1 }}
                textColor={COLORS.textGray}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handlePasswordChange}
                style={{ flex: 1 }}
                theme={{ colors: { primary: COLORS.primary } }}
              >
                Update
              </Button>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderReportsTab = () => (
    <View style={styles.sectionContainer}>
      <Title style={{ color: COLORS.text }}>Report Generation</Title>
      <Caption>Select report type and date range</Caption>

      <View style={styles.chipContainer}>
        {["daily", "weekly", "monthly"].map((type) => (
          <Chip
            key={type}
            selected={reportType === type}
            onPress={() => setReportType(type)}
            // ----------------------------------------------------
            // 👇 FIXED: Explicit colors to remove default purple
            // ----------------------------------------------------
            style={[
              styles.chip,
              {
                backgroundColor:
                  reportType === type ? COLORS.lightBlue : "#F1F5F9",
                borderColor: reportType === type ? COLORS.primary : "#E2E8F0",
                borderWidth: 1,
              },
            ]}
            textStyle={{
              color: reportType === type ? COLORS.primary : COLORS.textGray,
              fontWeight: "500",
            }}
            showSelectedOverlay={false} // Disable overlay to control exact color
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Chip>
        ))}
      </View>

      <View style={styles.card}>
        {(reportType === "daily" || reportType === "weekly") && (
          <TextInput
            label={
              reportType === "daily"
                ? "Date (YYYY-MM-DD)"
                : "Week Start (YYYY-MM-DD)"
            }
            value={reportDate}
            onChangeText={setReportDate}
            mode="outlined"
            placeholder="2025-08-26"
            left={<TextInput.Icon icon="calendar" color={COLORS.textGray} />}
            style={styles.input}
            activeOutlineColor={COLORS.primary}
            theme={{ colors: { primary: COLORS.primary } }}
          />
        )}

        {reportType === "monthly" && (
          <View style={styles.rowBtn}>
            <TextInput
              label="Year"
              value={reportYear}
              keyboardType="numeric"
              onChangeText={setReportYear}
              mode="outlined"
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              activeOutlineColor={COLORS.primary}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            <TextInput
              label="Month (0-11)"
              value={String(reportMonth)}
              keyboardType="numeric"
              onChangeText={(t) => setReportMonth(parseInt(t))}
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
              activeOutlineColor={COLORS.primary}
              theme={{ colors: { primary: COLORS.primary } }}
            />
          </View>
        )}

        <Button
          mode="contained"
          icon="download"
          onPress={handleGenerateReport}
          loading={isLoadingReport}
          disabled={isLoadingReport}
          style={styles.mt3}
          theme={{ colors: { primary: COLORS.primary } }}
        >
          Generate PDF
        </Button>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: COLORS.lightBlue, borderColor: COLORS.accent },
        ]}
      >
        <Text style={{ color: COLORS.primary, fontWeight: "bold" }}>
          Report Includes:
        </Text>
        <Text style={{ color: COLORS.secondary, fontSize: 12 }}>
          • Equipment status & health metrics
        </Text>
        <Text style={{ color: COLORS.secondary, fontSize: 12 }}>
          • Alert summaries by severity
        </Text>
        <Text style={{ color: COLORS.secondary, fontSize: 12 }}>
          • Maintenance activities & costs
        </Text>
      </View>
    </View>
  );

  const renderHelpTab = () => (
    <View style={styles.sectionContainer}>
      {/* System Status */}
      <View style={styles.systemStatus}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}> All Systems Operational</Text>
        <Text style={{ marginLeft: "auto", fontSize: 10, color: "green" }}>
          99.9% Uptime
        </Text>
      </View>

      <List.AccordionGroup>
        <List.Accordion
          title="Frequently Asked Questions"
          id="1"
          left={(props) => (
            <List.Icon {...props} icon="help-circle" color={COLORS.primary} />
          )}
          titleStyle={{ color: COLORS.text }}
        >
          <List.Item
            title="Common Issues"
            description="Check power cables first. Verify breakers."
            titleNumberOfLines={2}
          />
          <List.Item
            title="IoT Alerts"
            description={`"Maintenance Needed" means sensors crossed thresholds.`}
          />
          {isManagerOrAbove && (
            <List.Item
              title="Manager Tip"
              description="Use 'Generate PDF' in Reports tab."
              left={(props) => (
                <List.Icon {...props} icon="star" color={COLORS.accent} />
              )}
            />
          )}
        </List.Accordion>

        <List.Accordion
          title="Maintenance Support"
          id="2"
          left={(props) => (
            <List.Icon {...props} icon="wrench" color={COLORS.primary} />
          )}
          titleStyle={{ color: COLORS.text }}
        >
          <List.Item
            title="Breakdowns"
            description="Call helpline for critical failures."
          />
          {isTrainer && (
            <List.Item
              title="Reporting"
              description="Use 'Report Breakdown' in dashboard."
            />
          )}
        </List.Accordion>

        {isTrainer && (
          <List.Accordion
            title="Resources"
            id="3"
            left={(props) => (
              <List.Icon {...props} icon="school" color={COLORS.primary} />
            )}
            titleStyle={{ color: COLORS.text }}
          >
            <List.Item
              title="User Guides"
              description="Access SOPs and Safety checklists."
              onPress={() => Alert.alert("Link", "Open User Guides PDF")}
            />
            <List.Item
              title="Video Training"
              description="Tutorials on equipment usage."
              onPress={() => Alert.alert("Link", "Open Video Library")}
            />
          </List.Accordion>
        )}
      </List.AccordionGroup>

      {/* Forms */}
      <View style={styles.card}>
        <Title style={{ fontSize: 16, color: COLORS.text }}>Feedback</Title>
        <TextInput
          placeholder="Describe bug or feature..."
          multiline
          numberOfLines={3}
          value={feedbackText}
          onChangeText={setFeedbackText}
          mode="outlined"
          style={styles.input}
          activeOutlineColor={COLORS.primary}
          theme={{ colors: { primary: COLORS.primary } }}
        />
        <Button
          mode="contained"
          compact
          onPress={() => {
            setFeedbackText("");
            Alert.alert("Sent", "Feedback submitted!");
          }}
          theme={{ colors: { primary: COLORS.primary } }}
        >
          Submit Feedback
        </Button>
      </View>

      {/* Contact */}
      <View style={styles.rowBtn}>
        <View style={[styles.contactCard, { marginRight: 8 }]}>
          <IconButton icon="email" color={COLORS.primary} size={20} />
          <Text style={{ fontSize: 10, color: COLORS.text }}>
            Email Support
          </Text>
        </View>
        <View style={styles.contactCard}>
          <IconButton icon="phone" color="green" size={20} />
          <Text style={{ fontSize: 10, color: COLORS.text }}>
            +91 7357756699
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.userInfoSection}>
        <Avatar.Text
          size={70}
          label={user?.firstName ? user.firstName[0] : "U"}
          style={{ backgroundColor: COLORS.primary }}
        />
        <Title style={styles.title}>
          {user?.firstName} {user?.lastName}
        </Title>
        <Caption style={styles.caption}>{user?.email}</Caption>
        <View style={styles.roleContainer}>
          <Caption style={styles.role}>{user?.role?.replace("_", " ")}</Caption>
        </View>
      </View>

      {/* Tab Navigation Segment */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "profile" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("profile")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "profile" && styles.activeTabText,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "reports" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("reports")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "reports" && styles.activeTabText,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "help" && styles.activeTab]}
          onPress={() => setActiveTab("help")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "help" && styles.activeTabText,
            ]}
          >
            Help
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.contentScroll}>
        {activeTab === "profile" && renderProfileTab()}
        {activeTab === "reports" && renderReportsTab()}
        {activeTab === "help" && renderHelpTab()}

        <View style={styles.logoutBtn}>
          <Button
            mode="outlined"
            color="red"
            icon="logout"
            onPress={logout}
            style={{ borderColor: COLORS.error }}
            textColor={COLORS.error}
          >
            Log Out
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  userInfoSection: {
    paddingVertical: 20,
    alignItems: "center",
    backgroundColor: COLORS.background, // Changed to light blue
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    color: COLORS.text,
  },
  caption: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: "500",
    color: COLORS.textGray,
  },
  roleContainer: {
    marginTop: 5,
    backgroundColor: COLORS.lightBlue,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  role: { fontSize: 12, color: COLORS.primary, fontWeight: "bold" },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textGray, fontWeight: "500" },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },

  // Content
  contentScroll: { flex: 1, padding: 15 },
  sectionContainer: { marginBottom: 10 },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 15,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, marginBottom: 10, color: COLORS.text },
  input: { marginBottom: 10, backgroundColor: "#fff", fontSize: 14 },
  rowBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  mt2: { marginTop: 10 },
  mt3: { marginTop: 15 },

  // Report Specific
  chipContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 15,
  },
  chip: { flex: 1, marginHorizontal: 4 },

  // Help Specific
  systemStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4caf50",
  },
  statusText: { color: "#2e7d32", fontWeight: "bold", marginLeft: 8 },
  contactCard: {
    flex: 1,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: { marginVertical: 30, paddingHorizontal: 20 },
});

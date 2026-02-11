import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "@dealsworld/shared";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import apiClient from "./src/api/client";
import { auth } from "./src/config/firebase";

const ROLES = ["buyer", "seller", "admin"];
const STATUSES = ["active", "blocked"];

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.page}>
          <Card>
            <Text style={styles.title}>Admin UI Error</Text>
            <Text style={styles.errorText}>
              {String(this.state.error?.message || this.state.error)}
            </Text>
            <Text style={styles.bodyText}>
              Open browser console and share the first error stack line.
            </Text>
          </Card>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootApp() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setProfile(null);
      setProfileError("");
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchProfile = async () => {
    if (!auth.currentUser) return;
    setProfileLoading(true);
    setProfileError("");
    try {
      const response = await apiClient.get("/users/me");
      setProfile(response.data || null);
    } catch (error) {
      const message = error?.response?.data?.error || error.message || "Unable to load profile";
      setProfileError(message);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  if (authLoading) {
    return <CenteredLoading label="Checking session..." />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (profileLoading && !profile) {
    return <CenteredLoading label="Loading admin profile..." />;
  }

  const role = String(profile?.role || "").toLowerCase();
  if (role !== "admin") {
    return (
      <View style={styles.page}>
        <Card>
          <Text style={styles.title}>Admin Access Required</Text>
          <Text style={styles.bodyText}>
            Current role: {role || "unknown"}
          </Text>
          {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
          <Text style={styles.bodyText}>
            Run this once from backend:
          </Text>
          <Text style={styles.codeText}>npm run seed:admin -- &lt;uid&gt; admin</Text>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => signOut(auth)}
          >
            <Text style={styles.buttonTextSecondary}>Sign Out</Text>
          </TouchableOpacity>
        </Card>
      </View>
    );
  }

  return (
    <AdminDashboard
      user={user}
      profile={profile}
      onReloadProfile={fetchProfile}
      onLogout={() => signOut(auth)}
    />
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <RootApp />
    </AppErrorBoundary>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onLogin = async () => {
    const safeEmail = email.trim();
    if (!safeEmail || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, safeEmail, password);
    } catch (loginError) {
      const message =
        loginError?.code === "auth/invalid-credential"
          ? "Invalid email or password."
          : loginError?.message || "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <Card>
        <Text style={styles.title}>AdminBuddy Login</Text>
        <Text style={styles.bodyText}>Sign in with an admin Firebase account.</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}

function AdminDashboard({ user, profile, onReloadProfile, onLogout }) {
  const [activeTab, setActiveTab] = useState("deals");
  const [dealsLoading, setDealsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [dealsError, setDealsError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [sellerDealsError, setSellerDealsError] = useState("");
  const [pendingDeals, setPendingDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [rejectReasonByDeal, setRejectReasonByDeal] = useState({});
  const [query, setQuery] = useState("");
  const [showSellersOnly, setShowSellersOnly] = useState(false);
  const [sellerDealsByUser, setSellerDealsByUser] = useState({});
  const [expandedSellerId, setExpandedSellerId] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [workingDealId, setWorkingDealId] = useState("");
  const [loadingSellerDealsId, setLoadingSellerDealsId] = useState("");

  const loadDeals = async () => {
    setDealsLoading(true);
    setDealsError("");
    try {
      const response = await apiClient.get("/admin/deals/pending");
      setPendingDeals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const message = error?.response?.data?.error || error.message || "Unable to load pending deals";
      setDealsError(message);
    } finally {
      setDealsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const response = await apiClient.get("/admin/users?limit=300");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const message = error?.response?.data?.error || error.message || "Unable to load users";
      setUsersError(message);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
    loadUsers();
  }, []);

  const onApproveDeal = async (dealId) => {
    setWorkingDealId(dealId);
    try {
      await apiClient.post(`/admin/deals/${dealId}/approve`);
      setPendingDeals((current) => current.filter((deal) => deal.id !== dealId));
      setRejectReasonByDeal((current) => ({ ...current, [dealId]: "" }));
    } catch (error) {
      const message = error?.response?.data?.error || error.message || "Approve failed";
      setDealsError(message);
    } finally {
      setWorkingDealId("");
    }
  };

  const onRejectDeal = async (dealId) => {
    setWorkingDealId(dealId);
    try {
      const reason = String(rejectReasonByDeal[dealId] || "").trim();
      await apiClient.post(`/admin/deals/${dealId}/reject`, { reason });
      setPendingDeals((current) => current.filter((deal) => deal.id !== dealId));
      setRejectReasonByDeal((current) => ({ ...current, [dealId]: "" }));
    } catch (error) {
      const message = error?.response?.data?.error || error.message || "Reject failed";
      setDealsError(message);
    } finally {
      setWorkingDealId("");
    }
  };

  const onUpdateUser = async (uid, patch) => {
    setUpdatingUserId(uid);
    try {
      await apiClient.patch(`/admin/users/${uid}`, patch);
      setUsers((current) =>
        current.map((entry) => (entry.id === uid ? { ...entry, ...patch } : entry)),
      );
    } catch (error) {
      const message = error?.response?.data?.error || error.message || "User update failed";
      setUsersError(message);
    } finally {
      setUpdatingUserId("");
    }
  };

  const onToggleSellerDeals = async (sellerId) => {
    if (!sellerId) return;
    if (expandedSellerId === sellerId) {
      setExpandedSellerId("");
      return;
    }
    setExpandedSellerId(sellerId);
    if (sellerDealsByUser[sellerId]) return;
    setLoadingSellerDealsId(sellerId);
    setSellerDealsError("");
    try {
      const response = await apiClient.get(`/admin/sellers/${sellerId}/deals`);
      const list = Array.isArray(response.data) ? response.data : [];
      setSellerDealsByUser((current) => ({ ...current, [sellerId]: list }));
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error.message ||
        "Unable to load seller deals";
      setSellerDealsError(message);
    } finally {
      setLoadingSellerDealsId("");
    }
  };

  const filteredUsers = useMemo(() => {
    const token = query.trim().toLowerCase();
    const sourceUsers = showSellersOnly
      ? users.filter((entry) => String(entry?.role || "").toLowerCase() === "seller")
      : users;
    if (!token) return sourceUsers;
    return sourceUsers.filter((entry) => {
      const haystack = [
        entry.id,
        entry.email,
        entry.displayName,
        entry.role,
        entry.status,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(token);
    });
  }, [users, query, showSellersOnly]);

  const sellerStats = useMemo(() => {
    const sellerUsers = users.filter(
      (entry) => String(entry?.role || "").toLowerCase() === "seller",
    );
    const active = sellerUsers.filter(
      (entry) => String(entry?.status || "").toLowerCase() !== "blocked",
    ).length;
    const blocked = sellerUsers.length - active;
    return {
      total: sellerUsers.length,
      active,
      blocked,
    };
  }, [users]);

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>AdminBuddy</Text>
              <Text style={styles.bodyText}>
                {profile?.displayName || user?.email || "Admin"}
              </Text>
            </View>
            <TouchableOpacity style={styles.buttonSmall} onPress={onLogout}>
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tabRow}>
            <TabButton
              label={`Pending Deals (${pendingDeals.length})`}
              active={activeTab === "deals"}
              onPress={() => setActiveTab("deals")}
            />
            <TabButton
              label={`Users (${users.length})`}
              active={activeTab === "users"}
              onPress={() => setActiveTab("users")}
            />
          </View>
        </Card>

        {activeTab === "deals" ? (
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Deal Approval</Text>
              <TouchableOpacity style={styles.buttonSmall} onPress={loadDeals}>
                <Text style={styles.buttonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
            {dealsError ? <Text style={styles.errorText}>{dealsError}</Text> : null}
            {dealsLoading ? (
              <ActivityIndicator />
            ) : pendingDeals.length === 0 ? (
              <Text style={styles.bodyText}>No pending deals.</Text>
            ) : (
              pendingDeals.map((deal) => (
                <View key={deal.id} style={styles.listItem}>
                  <Text style={styles.itemTitle}>{deal.title || "Untitled deal"}</Text>
                  <Text style={styles.bodyText}>ID: {deal.id}</Text>
                  <Text style={styles.bodyText}>Seller: {deal.sellerId || "-"}</Text>
                  <Text style={styles.bodyText}>Category: {deal.category || "-"}</Text>
                  <Text style={styles.bodyText}>Status: {deal.status || "-"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Reject reason (optional)"
                    value={rejectReasonByDeal[deal.id] || ""}
                    onChangeText={(text) =>
                      setRejectReasonByDeal((current) => ({ ...current, [deal.id]: text }))
                    }
                  />
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonApprove]}
                      disabled={workingDealId === deal.id}
                      onPress={() => onApproveDeal(deal.id)}
                    >
                      <Text style={styles.buttonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonReject]}
                      disabled={workingDealId === deal.id}
                      onPress={() => onRejectDeal(deal.id)}
                    >
                      <Text style={styles.buttonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </Card>
        ) : (
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>User Management</Text>
              <TouchableOpacity style={styles.buttonSmall} onPress={loadUsers}>
                <Text style={styles.buttonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statChip}>Sellers: {sellerStats.total}</Text>
              <Text style={styles.statChip}>Active: {sellerStats.active}</Text>
              <Text style={styles.statChip}>Blocked: {sellerStats.blocked}</Text>
            </View>
            <View style={styles.actionRowWrap}>
              <TouchableOpacity
                style={[
                  styles.buttonMini,
                  !showSellersOnly && styles.buttonMiniActive,
                ]}
                onPress={() => setShowSellersOnly(false)}
              >
                <Text
                  style={[
                    styles.buttonMiniText,
                    !showSellersOnly && styles.buttonMiniTextActive,
                  ]}
                >
                  All Users
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.buttonMini,
                  showSellersOnly && styles.buttonMiniActive,
                ]}
                onPress={() => setShowSellersOnly(true)}
              >
                <Text
                  style={[
                    styles.buttonMiniText,
                    showSellersOnly && styles.buttonMiniTextActive,
                  ]}
                >
                  Sellers Only
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Search user by email, uid, role..."
              value={query}
              onChangeText={setQuery}
            />
            {usersError ? <Text style={styles.errorText}>{usersError}</Text> : null}
            {sellerDealsError ? <Text style={styles.errorText}>{sellerDealsError}</Text> : null}
            {usersLoading ? (
              <ActivityIndicator />
            ) : filteredUsers.length === 0 ? (
              <Text style={styles.bodyText}>No users found.</Text>
            ) : (
              filteredUsers.map((entry) => {
                const role = String(entry.role || "buyer").toLowerCase();
                const status = String(entry.status || "active").toLowerCase();
                return (
                  <View key={entry.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>
                      {entry.displayName || entry.email || entry.id}
                    </Text>
                    <Text style={styles.bodyText}>UID: {entry.id}</Text>
                    <Text style={styles.bodyText}>Email: {entry.email || "-"}</Text>
                    <Text style={styles.bodyText}>Role: {role}</Text>
                    <Text style={styles.bodyText}>Status: {status}</Text>
                    {role === "seller" ? (
                      <View style={styles.actionRowWrap}>
                        <TouchableOpacity
                          style={styles.buttonMini}
                          disabled={updatingUserId === entry.id}
                          onPress={() =>
                            onUpdateUser(entry.id, {
                              status: status === "blocked" ? "active" : "blocked",
                            })
                          }
                        >
                          <Text style={styles.buttonMiniText}>
                            {status === "blocked" ? "Enable Seller" : "Disable Seller"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.buttonMini,
                            expandedSellerId === entry.id && styles.buttonMiniActive,
                          ]}
                          disabled={loadingSellerDealsId === entry.id}
                          onPress={() => onToggleSellerDeals(entry.id)}
                        >
                          <Text
                            style={[
                              styles.buttonMiniText,
                              expandedSellerId === entry.id && styles.buttonMiniTextActive,
                            ]}
                          >
                            {expandedSellerId === entry.id ? "Hide Deals" : "View Deals"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <View style={styles.actionRowWrap}>
                      {ROLES.map((roleOption) => (
                        <TouchableOpacity
                          key={`${entry.id}_${roleOption}`}
                          style={[
                            styles.buttonMini,
                            role === roleOption && styles.buttonMiniActive,
                          ]}
                          disabled={updatingUserId === entry.id}
                          onPress={() => onUpdateUser(entry.id, { role: roleOption })}
                        >
                          <Text
                            style={[
                              styles.buttonMiniText,
                              role === roleOption && styles.buttonMiniTextActive,
                            ]}
                          >
                            {roleOption}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.actionRowWrap}>
                      {STATUSES.map((statusOption) => (
                        <TouchableOpacity
                          key={`${entry.id}_${statusOption}`}
                          style={[
                            styles.buttonMini,
                            status === statusOption && styles.buttonMiniActive,
                          ]}
                          disabled={updatingUserId === entry.id}
                          onPress={() => onUpdateUser(entry.id, { status: statusOption })}
                        >
                          <Text
                            style={[
                              styles.buttonMiniText,
                              status === statusOption && styles.buttonMiniTextActive,
                            ]}
                          >
                            {statusOption}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {expandedSellerId === entry.id ? (
                      <View style={styles.dealsPanel}>
                        {loadingSellerDealsId === entry.id ? (
                          <ActivityIndicator />
                        ) : (
                          (sellerDealsByUser[entry.id] || []).map((deal) => (
                            <View key={deal.id} style={styles.dealRow}>
                              <Text style={styles.dealTitle}>{deal.title || "Untitled deal"}</Text>
                              <Text style={styles.dealMeta}>ID: {deal.id}</Text>
                              <Text style={styles.dealMeta}>
                                Status: {deal.lifecycleStatus || deal.status || "-"}
                              </Text>
                              <Text style={styles.dealMeta}>
                                Approval: {deal.approvalStatus || "-"}
                              </Text>
                            </View>
                          ))
                        )}
                        {loadingSellerDealsId !== entry.id &&
                        (sellerDealsByUser[entry.id] || []).length === 0 ? (
                          <Text style={styles.bodyText}>No deals for this seller.</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </Card>
        )}

        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Admin Profile</Text>
            <TouchableOpacity style={styles.buttonSmall} onPress={onReloadProfile}>
              <Text style={styles.buttonText}>Reload</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.bodyText}>UID: {user.uid}</Text>
          <Text style={styles.bodyText}>Email: {user.email || "-"}</Text>
          <Text style={styles.bodyText}>Role: {profile?.role || "-"}</Text>
          <Text style={styles.bodyText}>Status: {profile?.status || "-"}</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function CenteredLoading({ label }) {
  return (
    <View style={styles.page}>
      <View style={styles.loadingWrap}>
        <ActivityIndicator />
        <Text style={styles.bodyText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.dashboardBg,
  },
  scrollContainer: {
    padding: 20,
    gap: 14,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  bodyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  codeText: {
    backgroundColor: theme.colors.text,
    color: theme.colors.onPrimary,
    borderRadius: 8,
    padding: 10,
    fontFamily: "monospace",
    fontSize: 12,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
  },
  button: {
    backgroundColor: theme.colors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonSmall: {
    backgroundColor: theme.colors.textMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surfaceLight,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonApprove: {
    backgroundColor: theme.colors.successDark,
    flex: 1,
  },
  buttonReject: {
    backgroundColor: theme.colors.error,
    flex: 1,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  buttonTextSecondary: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statChip: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceLighter,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  tabButtonText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: theme.colors.onPrimary,
  },
  listItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLighter,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  buttonMini: {
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
  },
  buttonMiniActive: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.text,
  },
  buttonMiniText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  buttonMiniTextActive: {
    color: theme.colors.onPrimary,
  },
  dealsPanel: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    borderRadius: 10,
    padding: 8,
    gap: 6,
    backgroundColor: theme.colors.surface,
  },
  dealRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 8,
    gap: 3,
    backgroundColor: theme.colors.surfaceLighter,
  },
  dealTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  dealMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});

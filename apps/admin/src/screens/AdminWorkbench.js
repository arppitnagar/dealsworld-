import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import apiClient from "../api/client";
import { theme } from "@dealsworld/shared/theme/theme";

const DEAL_FILTERS = ["all", "pending", "approved", "rejected", "active"];
const PAYMENT_FILTERS = [
  "all",
  "created",
  "authorized",
  "captured",
  "refunded",
  "failed",
];

export default function AdminWorkbench({
  user,
  profile,
  onReloadProfile,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState("deals");

  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState("");
  const [hasLoadedDeals, setHasLoadedDeals] = useState(false);
  const [dealQuery, setDealQuery] = useState("");
  const [dealFilter, setDealFilter] = useState("all");
  const [rejectReasonByDeal, setRejectReasonByDeal] = useState({});
  const [workingDealId, setWorkingDealId] = useState("");
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [dealActionPrompt, setDealActionPrompt] = useState(null);
  const [userActionPrompt, setUserActionPrompt] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false);
  const [sellerQuery, setSellerQuery] = useState("");
  const [buyerQuery, setBuyerQuery] = useState("");
  const [workingUserId, setWorkingUserId] = useState("");

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [hasLoadedPayments, setHasLoadedPayments] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [hasLoadedAnalytics, setHasLoadedAnalytics] = useState(false);

  const [versionGate, setVersionGate] = useState({});
  const [versionGateLoading, setVersionGateLoading] = useState(false);
  const [versionGateError, setVersionGateError] = useState("");
  const [hasLoadedVersionGate, setHasLoadedVersionGate] = useState(false);
  const [versionGateSaving, setVersionGateSaving] = useState(false);
  const [versionGateSaveError, setVersionGateSaveError] = useState("");
  const [versionGateSaved, setVersionGateSaved] = useState(false);

  const loadDeals = async (force = false) => {
    if (dealsLoading) return;
    if (hasLoadedDeals && !force) return;
    setDealsLoading(true);
    setDealsError("");
    try {
      const response = await apiClient.get("/admin/deals?limit=150");
      setDeals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setDealsError(
        error?.response?.data?.error || error.message || "Unable to load deals",
      );
    } finally {
      setDealsLoading(false);
      setHasLoadedDeals(true);
    }
  };

  const loadUsers = async (force = false) => {
    if (usersLoading) return;
    if (hasLoadedUsers && !force) return;
    setUsersLoading(true);
    setUsersError("");
    try {
      const response = await apiClient.get("/admin/users?limit=150");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setUsersError(
        error?.response?.data?.error || error.message || "Unable to load users",
      );
    } finally {
      setUsersLoading(false);
      setHasLoadedUsers(true);
    }
  };

  const loadPayments = async (force = false) => {
    if (paymentsLoading) return;
    if (hasLoadedPayments && !force) return;
    setPaymentsLoading(true);
    setPaymentsError("");
    try {
      const response = await apiClient.get("/admin/payments?limit=150");
      setPayments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setPaymentsError(
        error?.response?.data?.error ||
          error.message ||
          "Unable to load payments",
      );
    } finally {
      setPaymentsLoading(false);
      setHasLoadedPayments(true);
    }
  };

  const loadAnalytics = async (force = false) => {
    if (analyticsLoading) return;
    if (hasLoadedAnalytics && !force) return;
    setAnalyticsLoading(true);
    setAnalyticsError("");
    try {
      const response = await apiClient.get("/admin/analytics");
      setAnalytics(response.data || null);
    } catch (error) {
      setAnalyticsError(
        error?.response?.data?.error ||
          error.message ||
          "Unable to load analytics",
      );
    } finally {
      setAnalyticsLoading(false);
      setHasLoadedAnalytics(true);
    }
  };

  const loadVersionGate = async (force = false) => {
    if (versionGateLoading) return;
    if (hasLoadedVersionGate && !force) return;
    setVersionGateLoading(true);
    setVersionGateError("");
    try {
      const response = await apiClient.get("/app-config/version-gate");
      setVersionGate(response.data || {});
    } catch (error) {
      setVersionGateError(
        error?.response?.data?.error ||
          error.message ||
          "Unable to load app update settings",
      );
    } finally {
      setVersionGateLoading(false);
      setHasLoadedVersionGate(true);
    }
  };

  const updateVersionGateField = (appKey, field, value) => {
    setVersionGate((current) => ({
      ...current,
      [appKey]: { ...(current[appKey] || {}), [field]: value },
    }));
    setVersionGateSaved(false);
  };

  const saveVersionGate = async () => {
    setVersionGateSaving(true);
    setVersionGateSaveError("");
    setVersionGateSaved(false);
    try {
      const response = await apiClient.put(
        "/admin/app-config/version-gate",
        versionGate,
      );
      setVersionGate(response.data || versionGate);
      setVersionGateSaved(true);
    } catch (error) {
      setVersionGateSaveError(
        error?.response?.data?.error || error.message || "Save failed",
      );
    } finally {
      setVersionGateSaving(false);
    }
  };

  const refreshCurrentTab = async () => {
    if (activeTab === "deals") return loadDeals(true);
    if (activeTab === "sellers" || activeTab === "buyers") return loadUsers(true);
    if (activeTab === "payments") return loadPayments(true);
    if (activeTab === "analytics") return loadAnalytics(true);
    if (activeTab === "settings") return loadVersionGate(true);
    return null;
  };

  useEffect(() => {
    loadDeals();
  }, []);

  useEffect(() => {
    if (activeTab === "sellers" || activeTab === "buyers") {
      loadUsers();
    } else if (activeTab === "payments") {
      loadPayments();
    } else if (activeTab === "analytics") {
      loadAnalytics();
    } else if (activeTab === "settings") {
      loadVersionGate();
    }
  }, [activeTab]);

  const onApproveDeal = async (dealId) => {
    setWorkingDealId(dealId);
    try {
      await apiClient.post(`/admin/deals/${dealId}/approve`);
      setDeals((current) =>
        current.map((deal) =>
          deal.id === dealId
            ? {
                ...deal,
                approvalStatus: "approved",
                lifecycleStatus: "active",
                status: "active",
              }
            : deal,
        ),
      );
      setSelectedDeal((current) =>
        current?.id === dealId
          ? {
              ...current,
              approvalStatus: "approved",
              lifecycleStatus: "active",
              status: "active",
            }
          : current,
      );
      setRejectReasonByDeal((current) => ({ ...current, [dealId]: "" }));
    } catch (error) {
      setDealsError(
        error?.response?.data?.error || error.message || "Approve failed",
      );
    } finally {
      setWorkingDealId("");
    }
  };

  const onRejectDeal = async (dealId) => {
    setWorkingDealId(dealId);
    try {
      const reason = String(rejectReasonByDeal[dealId] || "").trim();
      await apiClient.post(`/admin/deals/${dealId}/reject`, { reason });
      setDeals((current) =>
        current.map((deal) =>
          deal.id === dealId
            ? {
                ...deal,
                approvalStatus: "rejected",
                lifecycleStatus: "rejected",
                status: "rejected",
              }
            : deal,
        ),
      );
      setSelectedDeal((current) =>
        current?.id === dealId
          ? {
              ...current,
              approvalStatus: "rejected",
              lifecycleStatus: "rejected",
              status: "rejected",
            }
          : current,
      );
      setRejectReasonByDeal((current) => ({ ...current, [dealId]: "" }));
    } catch (error) {
      setDealsError(
        error?.response?.data?.error || error.message || "Reject failed",
      );
    } finally {
      setWorkingDealId("");
    }
  };

  const openDealActionPrompt = (deal, action) => {
    if (!deal?.id || workingDealId) return;
    const isApprove = action === "approve";
    const reason = String(rejectReasonByDeal[deal.id] || "").trim();
    const title = isApprove ? "Accept deal?" : "Reject deal?";
    const message = isApprove
      ? "This deal will move from Pending to Approved."
      : reason
        ? `This deal will move from Pending to Rejected.\nReason: ${reason}`
        : "This deal will move from Pending to Rejected.";

    setDealActionPrompt({
      dealId: deal.id,
      action,
      title,
      message,
    });
  };

  const closeDealActionPrompt = () => {
    if (workingDealId) return;
    setDealActionPrompt(null);
  };

  const onConfirmDealAction = async () => {
    if (!dealActionPrompt?.dealId || workingDealId) return;
    const { dealId, action } = dealActionPrompt;
    if (action === "approve") {
      await onApproveDeal(dealId);
      if (dealFilter === "pending") setDealFilter("approved");
    } else {
      await onRejectDeal(dealId);
      if (dealFilter === "pending") setDealFilter("rejected");
    }
    setDealActionPrompt(null);
  };

  const onToggleUserStatus = async (entry) => {
    const uid = entry?.id;
    if (!uid) return;
    const nextStatus =
      String(entry.status || "active").toLowerCase() === "blocked"
        ? "active"
        : "blocked";
    setWorkingUserId(uid);
    try {
      await apiClient.patch(`/admin/users/${uid}`, { status: nextStatus });
      setUsers((current) =>
        current.map((userEntry) =>
          userEntry.id === uid ? { ...userEntry, status: nextStatus } : userEntry,
        ),
      );
    } catch (error) {
      setUsersError(
        error?.response?.data?.error || error.message || "User update failed",
      );
    } finally {
      setWorkingUserId("");
    }
  };

  const openUserActionPrompt = (entry) => {
    const uid = entry?.id;
    if (!uid || workingUserId) return;
    const isBlocked = String(entry.status || "active").toLowerCase() === "blocked";
    const nextStatus = isBlocked ? "active" : "blocked";
    const label = entry.displayName || entry.email || uid;
    setUserActionPrompt({
      uid,
      entry,
      nextStatus,
      title: isBlocked ? "Enable user?" : "Disable user?",
      message: `${label}\nStatus will be changed to ${nextStatus}.`,
      confirmTitle: isBlocked ? "Enable User" : "Disable User",
      success: isBlocked,
      danger: !isBlocked,
    });
  };

  const closeUserActionPrompt = () => {
    if (workingUserId) return;
    setUserActionPrompt(null);
  };

  const onConfirmUserAction = async () => {
    if (!userActionPrompt?.entry || workingUserId) return;
    await onToggleUserStatus(userActionPrompt.entry);
    setUserActionPrompt(null);
  };

  const computedDeals = useMemo(
    () => deals.map((deal) => ({ ...deal, computedStatus: getDealLifecycleStatus(deal) })),
    [deals],
  );

  const dealCounts = useMemo(() => {
    const counts = {
      all: computedDeals.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      active: 0,
    };
    computedDeals.forEach((deal) => {
      const approval = String(deal.approvalStatus || "").toLowerCase();
      if (approval === "pending") counts.pending += 1;
      if (approval === "approved") counts.approved += 1;
      if (approval === "rejected") counts.rejected += 1;
      if (deal.computedStatus === "active") counts.active += 1;
    });
    return counts;
  }, [computedDeals]);

  const filteredDeals = useMemo(() => {
    const token = dealQuery.trim().toLowerCase();
    return computedDeals.filter((deal) => {
      if (dealFilter !== "all") {
        if (dealFilter === "active") {
          if (deal.computedStatus !== "active") return false;
        } else if (String(deal.approvalStatus || "").toLowerCase() !== dealFilter) {
          return false;
        }
      }
      if (!token) return true;
      const haystack = [
        deal.id,
        deal.title,
        deal.description,
        deal.category,
        deal.location,
        deal.deliveryMode,
        deal.sellerName,
        deal.sellerDisplayName,
        deal.vendorName,
        deal.sellerId,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(token);
    });
  }, [computedDeals, dealQuery, dealFilter]);

  const sellers = useMemo(() => {
    const token = sellerQuery.trim().toLowerCase();
    return users
      .filter((entry) => String(entry.role || "").toLowerCase() === "seller")
      .filter((entry) =>
        [entry.id, entry.email, entry.displayName, entry.status]
          .map((value) => String(value || "").toLowerCase())
          .join(" ")
          .includes(token),
      );
  }, [users, sellerQuery]);

  const buyers = useMemo(() => {
    const token = buyerQuery.trim().toLowerCase();
    return users
      .filter((entry) => String(entry.role || "").toLowerCase() === "buyer")
      .filter((entry) =>
        [entry.id, entry.email, entry.displayName, entry.status]
          .map((value) => String(value || "").toLowerCase())
          .join(" ")
          .includes(token),
      );
  }, [users, buyerQuery]);

  const userDisplayNameById = useMemo(() => {
    const map = new Map();
    users.forEach((entry) => {
      const key = String(entry?.id || "").trim();
      if (!key) return;
      const name = String(entry?.displayName || "").trim();
      if (name) {
        map.set(key, name);
      }
    });
    return map;
  }, [users]);

  const filteredPayments = useMemo(
    () =>
      paymentFilter === "all"
        ? payments
        : payments.filter(
            (entry) =>
              String(entry.status || "").toLowerCase() === paymentFilter,
          ),
    [payments, paymentFilter],
  );

  const renderDealRow = ({ item: deal }) => {
    const detail = getDealDetailData(deal);
    const isPending = String(deal.approvalStatus || "").toLowerCase() === "pending";
    return (
      <View style={styles.listItem}>
        <View style={styles.rowBetween}>
          <Text style={styles.itemTitle}>{deal.title || "Untitled deal"}</Text>
          <StatusChip label={deal.computedStatus} />
        </View>
        <Text style={styles.bodyText}>ID: {deal.id}</Text>
        <Text style={styles.bodyText}>Seller: {formatSellerLabel(deal)}</Text>
        <Text style={styles.bodyText}>
          Category: {deal.category || "-"} | Location: {deal.location || "-"}
        </Text>
        {/pick/i.test(String(deal.deliveryMode || "")) ? (
          <Text style={styles.bodyText}>
            Store Address: {resolveStoreAddress(deal)}
          </Text>
        ) : null}
        <Text style={styles.bodyText}>
          Joined: {detail.joined}/{detail.target} | Views: {detail.views}
        </Text>
        <Text style={styles.bodyText}>Expires: {detail.expiresAtLabel}</Text>
        <View style={styles.chipWrap}>
          <ActionButton title="View Details" onPress={() => setSelectedDeal(deal)} dark />
          {isPending ? (
            <ActionButton
              title="Accept"
              onPress={() => openDealActionPrompt(deal, "approve")}
              success
              disabled={workingDealId === deal.id}
              loading={workingDealId === deal.id}
            />
          ) : null}
          {isPending ? (
            <ActionButton
              title="Reject"
              onPress={() => openDealActionPrompt(deal, "reject")}
              danger
              disabled={workingDealId === deal.id}
              loading={workingDealId === deal.id}
            />
          ) : null}
        </View>
        {isPending ? (
          <TextInput
            style={styles.input}
            placeholder="Reject reason (optional)"
            value={rejectReasonByDeal[deal.id] || ""}
            onChangeText={(text) =>
              setRejectReasonByDeal((current) => ({ ...current, [deal.id]: text }))
            }
          />
        ) : null}
      </View>
    );
  };

  const renderPaymentRow = ({ item: entry }) => (
    <View style={styles.listItem}>
      <View style={styles.rowBetween}>
        <Text style={styles.itemTitle}>{entry.paymentId || entry.id}</Text>
        <StatusChip label={entry.status || "unknown"} />
      </View>
      <Text style={styles.bodyText}>Deal: {entry.dealId || "-"}</Text>
      <Text style={styles.bodyText}>
        Buyer:{" "}
        {formatUserLabelById(
          entry.buyerId,
          userDisplayNameById,
          entry.buyerName || entry.buyerDisplayName,
          "Unknown buyer",
        )}{" "}
        | Seller:{" "}
        {formatUserLabelById(
          entry.sellerId,
          userDisplayNameById,
          entry.sellerName || entry.sellerDisplayName || entry.vendorName,
          "Unknown seller",
        )}
      </Text>
      <Text style={styles.bodyText}>
        Amount: {formatCurrency(entry.amount)} {String(entry.currency || "INR").toUpperCase()}
      </Text>
      <Text style={styles.bodyText}>Created: {formatDateTime(entry.createdAt)}</Text>
    </View>
  );

  const adminProfileFooter = (
    <AdminProfileCard user={user} profile={profile} onReloadProfile={onReloadProfile} />
  );

  return (
    <View style={styles.page}>
      <Card>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Admin Console</Text>
            <Text style={styles.bodyText}>
              {profile?.displayName || user?.email || "Admin"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ActionButton title="Refresh" onPress={refreshCurrentTab} />
            <ActionButton title="Logout" onPress={onLogout} />
          </View>
        </View>
        <View style={styles.tabWrap}>
          <TabButton
            label={`Deals (${dealCounts.pending})`}
            active={activeTab === "deals"}
            onPress={() => setActiveTab("deals")}
          />
          <TabButton
            label={`Sellers (${sellers.length})`}
            active={activeTab === "sellers"}
            onPress={() => setActiveTab("sellers")}
          />
          <TabButton
            label={`Buyers (${buyers.length})`}
            active={activeTab === "buyers"}
            onPress={() => setActiveTab("buyers")}
          />
          <TabButton
            label={`Payments (${payments.length})`}
            active={activeTab === "payments"}
            onPress={() => setActiveTab("payments")}
          />
          <TabButton
            label="Analytics"
            active={activeTab === "analytics"}
            onPress={() => setActiveTab("analytics")}
          />
          <TabButton
            label="App Updates"
            active={activeTab === "settings"}
            onPress={() => setActiveTab("settings")}
          />
        </View>
      </Card>

      {activeTab === "deals" ? (
        <FlatList
          style={styles.listFlex}
          contentContainerStyle={styles.scrollContainer}
          data={filteredDeals}
          keyExtractor={(deal) => deal.id}
          renderItem={renderDealRow}
          ListHeaderComponent={
            <Card>
              <Text style={styles.sectionTitle}>Deals Dashboard</Text>
              <Text style={styles.bodyText}>Approval is required only for Deals.</Text>
              <TextInput
                style={styles.input}
                placeholder="Search deals..."
                value={dealQuery}
                onChangeText={setDealQuery}
              />
              <View style={styles.chipWrap}>
                {DEAL_FILTERS.map((filter) => (
                  <TabButton
                    key={filter}
                    label={`${filter} (${dealCounts[filter] ?? 0})`}
                    active={dealFilter === filter}
                    onPress={() => setDealFilter(filter)}
                    compact
                  />
                ))}
              </View>
              {dealsError ? <Text style={styles.errorText}>{dealsError}</Text> : null}
            </Card>
          }
          ListEmptyComponent={
            <Card>
              {dealsLoading ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.bodyText}>No deals found.</Text>
              )}
            </Card>
          }
          ListFooterComponent={adminProfileFooter}
        />
      ) : activeTab === "sellers" ? (
        <UsersPanel
          title="Sellers Dashboard"
          description="Disable or enable seller users."
          loading={usersLoading}
          error={usersError}
          query={sellerQuery}
          onQueryChange={setSellerQuery}
          entries={sellers}
          workingUserId={workingUserId}
          onRequestToggleUserStatus={openUserActionPrompt}
          footer={adminProfileFooter}
        />
      ) : activeTab === "buyers" ? (
        <UsersPanel
          title="Buyers Dashboard"
          description="Disable or enable buyer users."
          loading={usersLoading}
          error={usersError}
          query={buyerQuery}
          onQueryChange={setBuyerQuery}
          entries={buyers}
          workingUserId={workingUserId}
          onRequestToggleUserStatus={openUserActionPrompt}
          footer={adminProfileFooter}
        />
      ) : activeTab === "payments" ? (
        <FlatList
          style={styles.listFlex}
          contentContainerStyle={styles.scrollContainer}
          data={filteredPayments}
          keyExtractor={(entry) => entry.id}
          renderItem={renderPaymentRow}
          ListHeaderComponent={
            <Card>
              <Text style={styles.sectionTitle}>Payments Dashboard</Text>
              <View style={styles.chipWrap}>
                {PAYMENT_FILTERS.map((filter) => (
                  <TabButton
                    key={filter}
                    label={filter}
                    active={paymentFilter === filter}
                    onPress={() => setPaymentFilter(filter)}
                    compact
                  />
                ))}
              </View>
              {paymentsError ? <Text style={styles.errorText}>{paymentsError}</Text> : null}
            </Card>
          }
          ListEmptyComponent={
            <Card>
              {paymentsLoading ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.bodyText}>No payments found.</Text>
              )}
            </Card>
          }
          ListFooterComponent={adminProfileFooter}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {activeTab === "analytics" ? (
            <Card>
              <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Analytics Dashboard</Text>
                <ActionButton title="Reload" onPress={() => loadAnalytics(true)} />
              </View>
              {analyticsError ? (
                <Text style={styles.errorText}>{analyticsError}</Text>
              ) : null}
              {analyticsLoading || !analytics ? (
                <ActivityIndicator />
              ) : (
                <>
                  <MetricsBlock
                    title="Deals"
                    items={[
                      ["Total", analytics?.deals?.total],
                      ["Pending", analytics?.deals?.pending],
                      ["Approved", analytics?.deals?.approved],
                      ["Active", analytics?.deals?.active],
                      ["Rejected", analytics?.deals?.rejected],
                      ["Conversion", `${analytics?.deals?.conversionRate || 0}%`],
                    ]}
                  />
                  <MetricsBlock
                    title="Users"
                    items={[
                      ["Total", analytics?.users?.total],
                      ["Sellers", analytics?.users?.sellers],
                      ["Buyers", analytics?.users?.buyers],
                      ["Blocked", analytics?.users?.blocked],
                    ]}
                  />
                  <MetricsBlock
                    title="Payments"
                    items={[
                      ["Total", analytics?.payments?.total],
                      ["Captured", analytics?.payments?.captured],
                      ["Refunded", analytics?.payments?.refunded],
                      ["Failed", analytics?.payments?.failed],
                      ["Volume", formatCurrency(analytics?.payments?.volume)],
                    ]}
                  />
                  <Text style={styles.bodyText}>
                    Updated: {formatDateTime(analytics.updatedAt)}
                  </Text>
                </>
              )}
            </Card>
          ) : null}

          {activeTab === "settings" ? (
            <Card>
              <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Force App Update</Text>
                <ActionButton title="Reload" onPress={() => loadVersionGate(true)} />
              </View>
              <Text style={styles.bodyText}>
                Set the oldest app version still allowed to sign in. Anyone on
                an older build is blocked with an update screen until they
                upgrade.
              </Text>
              {versionGateError ? (
                <Text style={styles.errorText}>{versionGateError}</Text>
              ) : null}
              {versionGateLoading && !hasLoadedVersionGate ? (
                <ActivityIndicator />
              ) : (
                <>
                  <VersionGateAppFields
                    label="Buyer app (DealBuddy)"
                    values={versionGate.buyer || {}}
                    onChange={(field, value) =>
                      updateVersionGateField("buyer", field, value)
                    }
                  />
                  <VersionGateAppFields
                    label="Seller app (SellerBuddy)"
                    values={versionGate.seller || {}}
                    onChange={(field, value) =>
                      updateVersionGateField("seller", field, value)
                    }
                  />
                  {versionGateSaveError ? (
                    <Text style={styles.errorText}>{versionGateSaveError}</Text>
                  ) : null}
                  {versionGateSaved ? (
                    <Text style={styles.bodyText}>Saved.</Text>
                  ) : null}
                  <View style={styles.chipWrap}>
                    <ActionButton
                      title={versionGateSaving ? "Saving..." : "Save changes"}
                      onPress={saveVersionGate}
                      disabled={versionGateSaving}
                      dark
                    />
                  </View>
                </>
              )}
            </Card>
          ) : null}

          {adminProfileFooter}
        </ScrollView>
      )}

      <DealDetailsModal
        visible={Boolean(selectedDeal)}
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
        workingDealId={workingDealId}
        rejectReasonByDeal={rejectReasonByDeal}
        setRejectReasonByDeal={setRejectReasonByDeal}
        onRequestApproveDeal={(deal) => openDealActionPrompt(deal, "approve")}
        onRequestRejectDeal={(deal) => openDealActionPrompt(deal, "reject")}
      />
      <DealActionConfirmModal
        visible={Boolean(dealActionPrompt)}
        prompt={dealActionPrompt}
        workingDealId={workingDealId}
        onConfirm={onConfirmDealAction}
        onCancel={closeDealActionPrompt}
      />
      <UserActionConfirmModal
        visible={Boolean(userActionPrompt)}
        prompt={userActionPrompt}
        workingUserId={workingUserId}
        onConfirm={onConfirmUserAction}
        onCancel={closeUserActionPrompt}
      />
    </View>
  );
}

function UsersPanel({
  title,
  description,
  loading,
  error,
  query,
  onQueryChange,
  entries,
  workingUserId,
  onRequestToggleUserStatus,
  footer,
}) {
  const renderEntry = ({ item: entry }) => {
    const isBlocked = String(entry.status || "active").toLowerCase() === "blocked";
    return (
      <View style={styles.listItem}>
        <View style={styles.rowBetween}>
          <Text style={styles.itemTitle}>
            {entry.displayName || entry.email || entry.id}
          </Text>
          <StatusChip label={entry.status || "active"} />
        </View>
        <Text style={styles.bodyText}>UID: {entry.id}</Text>
        <Text style={styles.bodyText}>Email: {entry.email || "-"}</Text>
        <ActionButton
          title={isBlocked ? "Enable User" : "Disable User"}
          onPress={() => onRequestToggleUserStatus(entry)}
          disabled={workingUserId === entry.id}
          loading={workingUserId === entry.id}
          {...(isBlocked ? { success: true } : { danger: true })}
        />
      </View>
    );
  };

  return (
    <FlatList
      style={styles.listFlex}
      contentContainerStyle={styles.scrollContainer}
      data={entries}
      keyExtractor={(entry) => entry.id}
      renderItem={renderEntry}
      ListHeaderComponent={
        <Card>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.bodyText}>{description}</Text>
          <TextInput
            style={styles.input}
            placeholder="Search user..."
            value={query}
            onChangeText={onQueryChange}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </Card>
      }
      ListEmptyComponent={
        <Card>
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.bodyText}>No users found.</Text>
          )}
        </Card>
      }
      ListFooterComponent={footer}
    />
  );
}

function AdminProfileCard({ user, profile, onReloadProfile }) {
  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Admin Profile</Text>
        <ActionButton title="Reload" onPress={onReloadProfile} />
      </View>
      <Text style={styles.bodyText}>UID: {user.uid}</Text>
      <Text style={styles.bodyText}>Email: {user.email || "-"}</Text>
      <Text style={styles.bodyText}>Role: {profile?.role || "-"}</Text>
      <Text style={styles.bodyText}>Status: {profile?.status || "-"}</Text>
    </Card>
  );
}

function DealDetailsModal({
  visible,
  deal,
  onClose,
  workingDealId,
  rejectReasonByDeal,
  setRejectReasonByDeal,
  onRequestApproveDeal,
  onRequestRejectDeal,
}) {
  if (!deal) return null;
  const detail = getDealDetailData(deal);
  const isPending = String(deal.approvalStatus || "").toLowerCase() === "pending";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Deal Details</Text>
            <ActionButton title="Close" onPress={onClose} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.listItem}>
              <Text style={styles.detailTitle}>{deal.title || "Untitled deal"}</Text>
              <Text style={styles.bodyText}>{deal.description || "No description"}</Text>
              <View style={styles.chipWrap}>
                <StatusChip label={detail.computedStatus} />
                <StatusChip label={`approval: ${deal.approvalStatus || "-"}`} />
              </View>
            </View>

            <Card>
              <Text style={styles.sectionTitle}>Core Details</Text>
              <DetailLine label="Deal ID" value={deal.id} />
              <DetailLine label="Seller" value={formatSellerLabel(deal)} />
              <DetailLine label="Category" value={deal.category} />
              <DetailLine label="Location" value={deal.location} />
              <DetailLine label="Delivery Mode" value={deal.deliveryMode} />
              <DetailLine
                label="Original Price"
                value={formatCurrency(deal.originalPrice)}
              />
              <DetailLine
                label="Deal Price"
                value={formatCurrency(deal.discountPrice || deal.price)}
              />
              <DetailLine
                label="GST"
                value={
                  deal.gstPercent || deal.gstPercent === 0
                    ? `${deal.gstPercent}%`
                    : "-"
                }
              />
              <DetailLine label="Min Buyers" value={detail.target} />
              <DetailLine label="Joined" value={detail.joined} />
              <DetailLine label="Expires At" value={detail.expiresAtLabel} />
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Deal Insights</Text>
              <MetricsBlock
                title=""
                items={[
                  ["Views", detail.views],
                  ["Marked Favourite", detail.favorites],
                  ["Joined", detail.joined],
                  ["Conversion", `${detail.conversionRate}%`],
                  ["Drop-off", `${detail.dropOffRate}%`],
                  ["Time to threshold", detail.timeToThresholdLabel],
                ]}
              />
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Logistics</Text>
              <DetailLine label="Delivery Mode" value={deal.deliveryMode || "-"} />
              <View style={styles.detailAddressBlock}>
                <Text style={styles.bodyText}>
                  {/pick/i.test(String(deal.deliveryMode || ""))
                    ? "Pickup Address"
                    : "Delivery Location"}
                </Text>
                <Text style={styles.itemValueTextMultiline}>
                  {resolveStoreAddress(deal)}
                </Text>
              </View>
            </Card>

            {isPending ? (
              <Card>
                <Text style={styles.sectionTitle}>Approval Action</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Reject reason (optional)"
                  value={rejectReasonByDeal[deal.id] || ""}
                  onChangeText={(text) =>
                    setRejectReasonByDeal((current) => ({
                      ...current,
                      [deal.id]: text,
                    }))
                  }
                />
                <View style={styles.chipWrap}>
                  <ActionButton
                    title="Accept Deal"
                    onPress={() => onRequestApproveDeal(deal)}
                    success
                    disabled={workingDealId === deal.id}
                    loading={workingDealId === deal.id}
                  />
                  <ActionButton
                    title="Reject Deal"
                    onPress={() => onRequestRejectDeal(deal)}
                    danger
                    disabled={workingDealId === deal.id}
                    loading={workingDealId === deal.id}
                  />
                </View>
              </Card>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DealActionConfirmModal({
  visible,
  prompt,
  onConfirm,
  onCancel,
  workingDealId,
}) {
  if (!prompt) return null;
  const isBusy = workingDealId === prompt.dealId;
  const isApprove = prompt.action === "approve";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>{prompt.title}</Text>
          <Text style={styles.confirmMessage}>{prompt.message}</Text>
          <View style={styles.confirmActions}>
            <ActionButton title="Cancel" onPress={onCancel} disabled={isBusy} />
            <ActionButton
              title={isApprove ? "Accept Deal" : "Reject Deal"}
              onPress={onConfirm}
              disabled={isBusy}
              loading={isBusy}
              {...(isApprove ? { success: true } : { danger: true })}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function UserActionConfirmModal({
  visible,
  prompt,
  onConfirm,
  onCancel,
  workingUserId,
}) {
  if (!prompt) return null;
  const isBusy = workingUserId === prompt.uid;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>{prompt.title}</Text>
          <Text style={styles.confirmMessage}>{prompt.message}</Text>
          <View style={styles.confirmActions}>
            <ActionButton title="Cancel" onPress={onCancel} disabled={isBusy} />
            <ActionButton
              title={prompt.confirmTitle}
              onPress={onConfirm}
              disabled={isBusy}
              loading={isBusy}
              {...(prompt.success ? { success: true } : { danger: true })}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MetricsBlock({ title, items }) {
  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.metricsWrap}>
        {items.map(([label, value]) => (
          <View key={label} style={styles.metricPill}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{String(value ?? "-")}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DetailLine({ label, value }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.bodyText}>{label}</Text>
      <Text style={styles.itemValueText}>{String(value || "-")}</Text>
    </View>
  );
}

function ActionButton({ title, onPress, disabled, dark, success, danger, loading }) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        dark ? styles.btnDark : null,
        success ? styles.btnSuccess : null,
        danger ? styles.btnDanger : null,
        (disabled || loading) ? styles.btnDisabled : null,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.onPrimary} />
      ) : (
        <Text style={styles.btnText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

function TabButton({ label, active, onPress, compact = false }) {
  return (
    <TouchableOpacity
      style={[styles.tab, active ? styles.tabActive : null, compact ? styles.tabCompact : null]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatusChip({ label }) {
  const token = String(label || "").toLowerCase();
  let style = styles.statusNeutral;
  if (token.includes("active") || token.includes("approved") || token.includes("captured")) {
    style = styles.statusSuccess;
  } else if (token.includes("pending") || token.includes("authorized") || token.includes("created")) {
    style = styles.statusWarning;
  } else if (token.includes("rejected") || token.includes("failed") || token.includes("blocked")) {
    style = styles.statusDanger;
  } else if (token.includes("refunded")) {
    style = styles.statusInfo;
  }
  return (
    <View style={[styles.statusChip, style]}>
      <Text style={styles.statusChipText}>{String(label || "-")}</Text>
    </View>
  );
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function VersionGateAppFields({ label, values, onChange }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.itemTitle}>{label}</Text>
      <Text style={styles.fieldLabel}>Minimum supported version</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 1.2.0"
        value={values.minVersion || ""}
        onChangeText={(text) => onChange("minVersion", text)}
        autoCapitalize="none"
      />
      <Text style={styles.fieldLabel}>Latest version (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 1.3.0"
        value={values.latestVersion || ""}
        onChangeText={(text) => onChange("latestVersion", text)}
        autoCapitalize="none"
      />
      <Text style={styles.fieldLabel}>Update link</Text>
      <TextInput
        style={styles.input}
        placeholder="https://... (APK download or store listing)"
        value={values.updateUrl || ""}
        onChangeText={(text) => onChange("updateUrl", text)}
        autoCapitalize="none"
      />
      <Text style={styles.fieldLabel}>Message shown to blocked users (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Custom message, or leave blank for the default"
        value={values.message || ""}
        onChangeText={(text) => onChange("message", text)}
      />
    </View>
  );
}

function formatSellerLabel(deal) {
  const sellerName = String(
    deal?.sellerName || deal?.sellerDisplayName || deal?.vendorName || "",
  ).trim();
  return sellerName || "-";
}

function formatUserLabelById(
  userId,
  userDisplayNameById = new Map(),
  preferredName = "",
  fallbackLabel = "Unknown user",
) {
  const preferred = String(preferredName || "").trim();
  if (preferred) return preferred;
  const id = String(userId || "").trim();
  if (!id) return "-";
  const name = String(userDisplayNameById.get(id) || "").trim();
  return name || fallbackLabel;
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getTimeMs(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toDate === "function") {
    const parsed = value.toDate();
    return parsed instanceof Date ? parsed.getTime() : null;
  }
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return numeric < 1e12 ? numeric * 1000 : numeric;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    const nanos = value.nanoseconds ?? value._nanoseconds ?? 0;
    if (typeof seconds === "number") {
      return seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }
  return null;
}

function formatDateTime(value) {
  const ms = getTimeMs(value);
  if (!ms) return "-";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(ms));
  } catch (_error) {
    return new Date(ms).toISOString();
  }
}

function formatCurrency(value, currency = "INR") {
  const amount = safeNumber(value, 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (_error) {
    return `₹${amount}`;
  }
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "-";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatAddressText(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object") return "";
  const fullName = value.name || value.fullName || value.recipientName;
  const cityLine = [value.city, value.state, value.pincode]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .join(", ");
  const parts = [fullName, value.line1, value.line2, cityLine, value.country]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  const phone = String(value.phone || value.mobile || "").trim();
  if (phone) {
    parts.push(`Phone: ${phone}`);
  }
  return parts.join("\n");
}

function resolveStoreAddress(deal) {
  return (
    formatAddressText(deal?.storeAddress) ||
    formatAddressText(deal?.pickupAddress) ||
    formatAddressText(deal?.location) ||
    "-"
  );
}

function getDealLifecycleStatus(deal) {
  const approval = String(deal?.approvalStatus || "").toLowerCase();
  if (approval === "pending") return "pending";
  if (approval === "rejected") return "rejected";

  const status = String(deal?.lifecycleStatus || deal?.status || "").toLowerCase();
  if (status === "rejected" || status === "pending") return status;

  const now = Date.now();
  const expiryMs = getTimeMs(deal?.expiresAt || deal?.expiryTime);
  if (!expiryMs || expiryMs <= now) return "expired";

  const joined = safeNumber(deal?.joinedUsers ?? deal?.currentJoins, 0);
  const target = Math.max(1, safeNumber(deal?.minGroupSize ?? deal?.minThreshold, 1));
  if (joined >= target) return "locked";

  return "active";
}

function getDealDetailData(deal) {
  const joined = safeNumber(deal?.joinedUsers ?? deal?.currentJoins, 0);
  const target = Math.max(1, safeNumber(deal?.minGroupSize ?? deal?.minThreshold, 1));
  const views = safeNumber(deal?.viewsCount ?? deal?.views, 0);
  const favorites = safeNumber(
    deal?.favoritesCount ?? deal?.favouritesCount ?? deal?.likedCount,
    0,
  );
  const joinEvents = safeNumber(deal?.joinEventsCount, 0);
  const leftCount = safeNumber(deal?.leftCount, 0);
  const conversionRate = views > 0 ? Number(((joined / views) * 100).toFixed(2)) : 0;
  const dropOffRate =
    joinEvents > 0 ? Number(((leftCount / joinEvents) * 100).toFixed(2)) : 0;
  const createdAtMs = getTimeMs(deal?.createdAt);
  const thresholdAtMs = getTimeMs(deal?.thresholdReachedAt);
  const timeToThresholdMs =
    createdAtMs && thresholdAtMs && thresholdAtMs > createdAtMs
      ? thresholdAtMs - createdAtMs
      : null;

  return {
    joined,
    target,
    views,
    favorites,
    conversionRate,
    dropOffRate,
    computedStatus: getDealLifecycleStatus(deal),
    expiresAtLabel: formatDateTime(deal?.expiresAt || deal?.expiryTime),
    timeToThresholdLabel: formatDuration(timeToThresholdMs),
  };
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.dashboardBg },
  listFlex: { flex: 1 },
  scrollContainer: { padding: 20, gap: 14 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: "800", color: theme.colors.text },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  bodyText: { color: theme.colors.textMuted, fontSize: 13 },
  itemTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  itemValueText: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  itemValueTextMultiline: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 4,
    lineHeight: 18,
  },
  detailAddressBlock: {
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
  },
  errorText: { color: theme.colors.error, fontSize: 13, fontWeight: "600" },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  headerActions: { flexDirection: "row", gap: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  tabWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tab: {
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceLighter,
  },
  tabCompact: { paddingHorizontal: 10, paddingVertical: 6 },
  tabActive: { borderColor: theme.colors.text, backgroundColor: theme.colors.text },
  tabText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: theme.colors.onPrimary },
  listItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLighter,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  btn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.textMuted,
    backgroundColor: theme.colors.textMuted,
  },
  btnDark: { borderColor: theme.colors.text, backgroundColor: theme.colors.text },
  btnSuccess: { borderColor: theme.colors.successDark, backgroundColor: theme.colors.successDark },
  btnDanger: { borderColor: theme.colors.error, backgroundColor: theme.colors.error },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: theme.colors.onPrimary, fontSize: 12, fontWeight: "700" },
  statusChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  statusChipText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  statusNeutral: { borderColor: theme.colors.surfaceLight, backgroundColor: theme.colors.surfaceLight },
  statusSuccess: { borderColor: theme.colors.successDark, backgroundColor: theme.colors.successSoftAlt },
  statusWarning: { borderColor: theme.colors.warning, backgroundColor: theme.colors.amberSoft },
  statusDanger: { borderColor: theme.colors.error, backgroundColor: theme.colors.dangerSoftAlt },
  statusInfo: { borderColor: theme.colors.primary, backgroundColor: theme.colors.infoSoft },
  metricsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricPill: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLighter,
    borderRadius: 10,
    minWidth: "31%",
    padding: 10,
    gap: 4,
  },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: "600" },
  metricValue: { fontSize: 14, color: theme.colors.text, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: theme.colors.overlayStrong, justifyContent: "flex-end" },
  modalSheet: {
    maxHeight: "94%",
    backgroundColor: theme.colors.dashboardBg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 10,
  },
  confirmBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.overlayStrong,
    padding: 16,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 10,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
  },
  confirmMessage: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  detailTitle: { fontSize: 20, color: theme.colors.text, fontWeight: "800" },
});

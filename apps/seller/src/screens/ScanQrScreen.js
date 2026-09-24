import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, TopPageHeader, useTheme, useI18n } from "@dealsworld/shared";
import { useConfirmPickup } from "../hooks/useDeliveryStatus";

// Matches the payload PickupQrDisplay.js encodes on the buyer side:
// DWPICKUP:{dealId}:{buyerId}:{token}
const QR_PREFIX = "DWPICKUP:";

function parsePickupPayload(raw) {
  const value = String(raw || "");
  if (!value.startsWith(QR_PREFIX)) return null;
  const [dealId, buyerId, token] = value.slice(QR_PREFIX.length).split(":");
  if (!dealId || !buyerId || !token) return null;
  return { dealId, buyerId, token };
}

// Re-armed after every scan result (success or failure) so a seller can work
// through a queue of buyers one after another without leaving this screen.
export default function ScanQrScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const { mutate: confirmPickup } = useConfirmPickup();
  const [result, setResult] = useState(null); // { status: "success"|"error", message, buyerName }
  const scanLockRef = useRef(false);

  const rearm = useCallback(() => {
    scanLockRef.current = false;
    setResult(null);
  }, []);

  const handleBarcodeScanned = useCallback(
    ({ data }) => {
      if (scanLockRef.current) return;
      const payload = parsePickupPayload(data);
      if (!payload) {
        scanLockRef.current = true;
        setResult({ status: "error", message: t("scanQr.notPickupCode") });
        return;
      }

      scanLockRef.current = true;
      confirmPickup(payload, {
        onSuccess: (data) => {
          if (data?.alreadyDelivered) {
            setResult({
              status: "error",
              message: t("scanQr.alreadyConfirmed", {
                buyer: data.buyerName || t("scanQr.thisBuyer"),
              }),
            });
            return;
          }
          setResult({
            status: "success",
            message: data?.title
              ? t("scanQr.confirmedWithTitle", {
                  buyer: data?.buyerName || t("scanQr.buyer"),
                  title: data.title,
                })
              : t("scanQr.confirmed", { buyer: data?.buyerName || t("scanQr.buyer") }),
          });
        },
        onError: (error) => {
          const message =
            error?.response?.data?.error || error?.message || t("scanQr.failed");
          setResult({ status: "error", message });
        },
      });
    },
    [confirmPickup, t],
  );

  return (
    <View style={styles.screen}>
      <TopPageHeader title={t("scanQr.title")} onBack={() => navigation.goBack()} rounded />

      <View style={styles.cameraWrap}>
        {!permission ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.centerFill} />
        ) : !permission.granted ? (
          <View style={styles.permissionWrap}>
            <Ionicons name="camera-outline" size={40} color={theme.colors.textMuted} />
            <Text style={styles.permissionText}>{t("scanQr.permission")}</Text>
            <AppButton title={t("scanQr.grant")} onPress={requestPermission} />
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={result ? undefined : handleBarcodeScanned}
            />
            <View style={styles.frame} pointerEvents="none" />
          </>
        )}
      </View>

      {result ? (
        <View
          style={[
            styles.resultBar,
            result.status === "success" ? styles.resultBarSuccess : styles.resultBarError,
          ]}
        >
          <Ionicons
            name={result.status === "success" ? "checkmark-circle" : "alert-circle"}
            size={22}
            color={
              result.status === "success" ? theme.colors.success : theme.colors.error
            }
          />
          <Text style={styles.resultText}>{result.message}</Text>
          <AppButton title={t("scanQr.next")} onPress={rearm} style={styles.resultButton} />
        </View>
      ) : (
        <Text style={styles.hintText}>{t("scanQr.hint")}</Text>
      )}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.dashboardBg,
    },
    cameraWrap: {
      flex: 1,
      margin: 20,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: theme.colors.surfaceMuted,
    },
    centerFill: {
      flex: 1,
    },
    permissionWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      padding: 24,
    },
    permissionText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    frame: {
      position: "absolute",
      top: "22%",
      left: "15%",
      right: "15%",
      bottom: "22%",
      borderWidth: 3,
      borderColor: theme.colors.primary,
      borderRadius: 16,
    },
    hintText: {
      textAlign: "center",
      color: theme.colors.textMuted,
      fontSize: 13,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    resultBar: {
      marginHorizontal: 20,
      marginBottom: 24,
      padding: 16,
      borderRadius: 16,
      alignItems: "center",
      gap: 10,
    },
    resultBarSuccess: {
      backgroundColor: theme.colors.successSoft,
    },
    resultBarError: {
      backgroundColor: theme.colors.dangerSoft,
    },
    resultText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      textAlign: "center",
    },
    resultButton: {
      minWidth: 160,
    },
  });

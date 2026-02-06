import React from "react";
import { View, Text, StyleSheet } from "react-native";
import DetailHeader from "./DetailHeader";
import StatusPill from "./StatusPill";
import DetailRow from "./DetailRow";
import InfoCard from "./InfoCard";
import PriceBlock from "./PriceBlock";
import MetricsGrid from "./MetricsGrid";
import SectionHeader from "./SectionHeader";
import { theme } from "../theme/theme";

export default function DealDetailsView({
  deal,
  statusLabel,
  statusColor,
  location,
  expiryLabel,
  description,
  price,
  original,
  meta,
  metricsTitle,
  metricsItems,
  showDescription = true,
  onChat,
  onEdit,
  editLabel,
  editIcon,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <InfoCard style={styles.headerCard}>
        <DetailHeader
          category={deal?.category || "General"}
          title={deal?.title || "Deal"}
          onChat={onChat}
          onEdit={onEdit}
          editLabel={editLabel}
          editIcon={editIcon}
        />

        {statusLabel ? (
          <View style={styles.statusRow}>
            <StatusPill label={statusLabel} color={statusColor} />
          </View>
        ) : null}

        {location ? (
          <DetailRow
            icon="location-outline"
            label="Location"
            value={location}
            color={theme.colors.textMuted}
            style={styles.detailRow}
          />
        ) : null}

        {expiryLabel ? (
          <DetailRow
            icon="calendar-outline"
            label="Expiry"
            value={expiryLabel}
            color={theme.colors.textMuted}
            style={styles.detailRow}
          />
        ) : null}

        {showDescription && description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </InfoCard>

      {price !== undefined || original !== undefined || meta ? (
        <InfoCard style={styles.priceCard}>
          <PriceBlock price={price} original={original} meta={meta} />
        </InfoCard>
      ) : null}

      {metricsItems && metricsItems.length > 0 ? (
        <View style={styles.metricsSection}>
          {metricsTitle ? <SectionHeader title={metricsTitle} /> : null}
          <MetricsGrid items={metricsItems} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerCard: {
    backgroundColor: theme.colors.infoSoft,
    borderColor: theme.colors.infoBorder,
  },
  statusRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  detailRow: {
    marginTop: 6,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 12,
    lineHeight: 20,
  },
  priceCard: {
    marginTop: 20,
    backgroundColor: theme.colors.infoSoft,
    borderColor: theme.colors.infoBorder,
  },
  metricsSection: {
    marginTop: 20,
  },
});

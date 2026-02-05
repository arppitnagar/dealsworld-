import React from "react";
import { View } from "react-native";
import SkeletonCard from "./SkeletonCard";

export default function SkeletonList({ count = 3, shimmerDuration }) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <View>
      {items.map((i) => (
        <SkeletonCard key={i} shimmerDuration={shimmerDuration} />
      ))}
    </View>
  );
}

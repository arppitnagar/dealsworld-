import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ChevronLeft, MapPin, MessageCircle } from "lucide-react-native";
import CountdownTimer from "../components/CountdownTimer";
import { useDeals, useRecordDealView, useLeaveDeal } from "../hooks/useDeals";
import { hasViewedDeal, markViewedDeal } from "../utils/viewCache";

export default function DealDetailsScreen({ route, navigation }) {
  const { dealId } = route.params || {};
  const { data: deals, isLoading } = useDeals();
  const { mutate: recordView } = useRecordDealView();
  const { mutate: leaveDeal, isLoading: leaving } = useLeaveDeal();
  const hasRecorded = useRef(false);
  const [hasLeft, setHasLeft] = useState(false);

  const deal = useMemo(
    () => deals?.find((d) => d.id === dealId),
    [deals, dealId],
  );

  useEffect(() => {
    if (!dealId || hasRecorded.current) return;
    if (!hasViewedDeal(dealId)) {
      recordView(dealId, {
        onSuccess: () => markViewedDeal(dealId),
      });
    }
    hasRecorded.current = true;
  }, [dealId, recordView]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!deal) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-6">
        <Text className="text-gray-500 font-medium mb-4">
          Deal not found.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-gray-900 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleLeaveDeal = () => {
    if (!dealId || leaving || hasLeft) return;
    Alert.alert(
      "Leave Deal",
      "Are you sure you want to leave this deal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            leaveDeal(dealId, {
              onSuccess: () => setHasLeft(true),
            });
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white">
        <View className="relative">
          <Image
            source={{
              uri: deal.imageUrl || "https://via.placeholder.com/600x300",
            }}
            className="w-full h-64"
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute top-12 left-4 bg-white/90 p-2 rounded-full"
          >
            <ChevronLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <View className="absolute top-12 right-4 flex-row items-center space-x-2">
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("DealChat", { dealId: deal.id, deal })
              }
              className="bg-white/90 p-2 rounded-full"
            >
              <MessageCircle size={18} color="#0F172A" />
            </TouchableOpacity>
            <CountdownTimer expiryTime={deal.expiryTime} />
          </View>
        </View>
      </View>

      <ScrollView className="px-5 pt-5 pb-10">
        <View className="flex-row items-center mb-2">
          <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">
            {deal.category}
          </Text>
          <View className="flex-row items-center ml-3">
            <MapPin size={12} color="#64748B" />
            <Text className="text-xs text-gray-500 ml-1">
              {deal.location || "Location"}
            </Text>
          </View>
        </View>

        <Text className="text-2xl font-black text-gray-900">
          {deal.title}
        </Text>
        <Text className="text-sm text-gray-500 mt-2 leading-5">
          {deal.description}
        </Text>

        <View className="mt-5 bg-white rounded-2xl p-4 border border-gray-100">
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl font-black text-gray-900">
              ₹{deal.discountPrice}
            </Text>
            <Text className="text-sm text-gray-400 line-through ml-2">
              ₹{deal.originalPrice}
            </Text>
          </View>
          <Text className="text-xs text-gray-500">
            {deal.joinedUsers || 0} joined · Target {deal.minGroupSize || 1}
          </Text>
        </View>

        <View className="mt-6 bg-white rounded-2xl p-4 border border-gray-100">
          <Text className="text-sm font-bold text-gray-900 mb-2">
            Participation
          </Text>
          <TouchableOpacity
            onPress={handleLeaveDeal}
            disabled={leaving || hasLeft}
            className={`p-4 rounded-xl items-center ${
              leaving || hasLeft
                ? "bg-gray-100"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <Text
              className={`font-bold ${
                leaving || hasLeft ? "text-gray-400" : "text-red-600"
              }`}
            >
              {hasLeft ? "You left this deal" : leaving ? "Leaving..." : "Leave Deal"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

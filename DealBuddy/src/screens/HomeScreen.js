import React from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Search, Flame, MapPin, ChevronRight } from "lucide-react-native";
import { useDeals } from "../hooks/useDeals";
import CountdownTimer from "../components/CountdownTimer";

const CATEGORIES = ["All", "Food", "Fashion", "Electronics", "Home", "Fitness"];

const DealCard = ({ deal, navigation }) => {
  // Calculate progress percentage for the progress bar
  const progress = Math.min((deal.currentJoins / deal.minThreshold) * 100, 100);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("DealDetails", { dealId: deal.id })}
      className="bg-white rounded-3xl mb-5 shadow-sm overflow-hidden border border-gray-100"
    >
      {/* Deal Image */}
      <View>
        <Image
          source={{
            uri: deal.imageUrl || "https://via.placeholder.com/400x200",
          }}
          className="w-full h-48"
          resizeMode="cover"
        />
        <View className="absolute top-3 right-3">
          <CountdownTimer expiryTime={deal.expiryTime} />
        </View>
      </View>

      <View className="p-4">
        {/* Category & Status */}
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">
            {deal.category}
          </Text>
          <View className="flex-row items-center">
            <Flame size={14} color="#f97316" />
            <Text className="text-orange-600 text-xs ml-1 font-bold">
              {deal.currentJoins} joined
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text
          className="text-lg font-bold text-gray-900 mb-1"
          numberOfLines={1}
        >
          {deal.title}
        </Text>

        {/* Pricing */}
        <View className="flex-row items-center mb-3">
          <Text className="text-xl font-black text-gray-900">
            ₹{deal.discountPrice}
          </Text>
          <Text className="text-sm text-gray-400 line-through ml-2">
            ₹{deal.originalPrice}
          </Text>
          <View className="ml-auto bg-green-100 px-2 py-1 rounded">
            <Text className="text-green-700 text-[10px] font-bold">
              {Math.round(
                ((deal.originalPrice - deal.discountPrice) /
                  deal.originalPrice) *
                  100,
              )}
              % OFF
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="bg-gray-100 h-2.5 rounded-full overflow-hidden mb-2">
          <View
            className="bg-blue-500 h-full"
            style={{ width: `${progress}%` }}
          />
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-[10px] text-gray-500 font-medium">
            {deal.minThreshold - deal.currentJoins > 0
              ? `${deal.minThreshold - deal.currentJoins} more users needed`
              : "Deal Unlocked!"}
          </Text>

          <View className="flex-row items-center">
            <Text className="text-blue-600 font-bold text-sm mr-1">
              View Deal
            </Text>
            <ChevronRight size={16} color="#2563eb" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen({ navigation }) {
  const { data: deals, isLoading, error, refetch } = useDeals();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-500 font-medium">
          Finding hot deals...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-14 pb-4 px-5 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">
              Your Location
            </Text>
            <View className="flex-row items-center">
              <MapPin
                size={16}
                color="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
              />
              <Text className="font-bold text-gray-900 ml-1">Mumbai, MH</Text>
            </View>
          </View>
          <TouchableOpacity className="bg-gray-100 p-2.5 rounded-full">
            <Search size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* Banner Ad Section */}
        <View className="p-5">
          <TouchableOpacity className="bg-blue-600 rounded-3xl p-5 flex-row items-center">
            <View className="flex-1">
              <Text className="text-white font-black text-xl">
                Refer & Earn ₹100
              </Text>
              <Text className="text-blue-100 text-xs mt-1">
                Get rewards when your friends join a deal
              </Text>
            </View>
            <View className="bg-white/20 p-3 rounded-2xl">
              <ChevronRight size={24} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Categories Horizontal Scroll */}
        <View className="mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20 }}
          >
            {CATEGORIES.map((cat, index) => (
              <TouchableOpacity
                key={cat}
                className={`px-6 py-2.5 rounded-2xl mr-2 border ${index === 0 ? "bg-gray-900 border-gray-900" : "bg-white border-gray-200"}`}
              >
                <Text
                  className={`font-bold text-xs ${index === 0 ? "text-white" : "text-gray-600"}`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Deal List */}
        <View className="px-5 pb-10">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-xl font-black text-gray-900">
              Featured Deals
            </Text>
            <TouchableOpacity>
              <Text className="text-blue-600 font-bold text-xs">See All</Text>
            </TouchableOpacity>
          </View>

          {deals?.length > 0 ? (
            deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} navigation={navigation} />
            ))
          ) : (
            <View className="py-20 items-center">
              <Text className="text-gray-400">
                No active deals found near you.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

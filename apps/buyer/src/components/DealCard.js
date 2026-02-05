import { CountdownTimer } from "@dealsworld/shared";

// ... inside your DealCard component
<View className="flex-row justify-between items-center mt-2">
  <CountdownTimer
    expiryTime={deal.expiryTime}
    onExpire={() => console.log("Refresh list")}
  />
  <Text className="text-gray-400 text-xs">Min: {deal.minGroupSize} users</Text>
</View>;

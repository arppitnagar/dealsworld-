import React, { useState, useEffect } from "react";
import { Text, View } from "react-native";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

// Extend dayjs to handle durations
dayjs.extend(duration);

const CountdownTimer = ({ expiryTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = dayjs();
    const expiry = dayjs(expiryTime);
    const diff = expiry.diff(now);

    if (diff <= 0) return null;

    const dur = dayjs.duration(diff);
    return {
      hours: String(Math.floor(dur.asHours())).padStart(2, "0"),
      minutes: String(dur.minutes()).padStart(2, "0"),
      seconds: String(dur.seconds()).padStart(2, "0"),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      if (!remaining) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryTime]);

  if (!timeLeft) {
    return <Text className="text-red-500 font-bold">Deal Expired</Text>;
  }

  return (
    <View className="flex-row items-center bg-red-50 px-3 py-1 rounded-lg border border-red-100">
      <Text className="text-red-600 font-mono font-bold text-xs">
        {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
      </Text>
      <Text className="text-red-400 text-[10px] ml-1 font-medium">left</Text>
    </View>
  );
};

export default CountdownTimer;

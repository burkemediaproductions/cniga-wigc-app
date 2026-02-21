import { useEffect } from "react";
import ScheduleScreen from "./ScheduleScreen";

/**
 * Networking-only wrapper.
 */
export default function ScheduleNetworkingScreen(props) {
  const { navigation } = props;

  useEffect(() => {
    navigation?.setOptions?.({ title: "Networking" });
  }, [navigation]);
  return <ScheduleScreen {...props} />;
}
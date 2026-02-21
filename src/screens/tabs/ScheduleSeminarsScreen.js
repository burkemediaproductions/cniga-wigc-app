import { useEffect } from "react";
import ScheduleScreen from "./ScheduleScreen";

/**
 * Seminars-only wrapper.
 */
export default function ScheduleSeminarsScreen(props) {
  const { navigation } = props;

  useEffect(() => {
    navigation?.setOptions?.({ title: "Seminars" });
  }, [navigation]);
  return <ScheduleScreen {...props} />;
}
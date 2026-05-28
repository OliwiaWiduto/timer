import { useEffect, useRef } from "react";
import { checkForAppUpdate } from "@/lib/appUpdate";

/** Runs once per app session after the user is signed in. */
export function UpdateChecker() {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    void checkForAppUpdate();
  }, []);

  return null;
}

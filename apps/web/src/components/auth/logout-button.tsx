"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authRequest } from "@/lib/auth/request";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    const { error } = await authRequest("logout");
    if (error) {
      setPending(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={pending}>
      {pending ? "Logging out..." : "Log out"}
    </Button>
  );
}

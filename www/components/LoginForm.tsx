"use client";

import { Button } from "@/components/ui/button";
import { handleLoginWithGithub } from "@/actions/OAuth";

export default function LoginWithGitHub() {
  return (
    <div>
      <Button onClick={handleLoginWithGithub}>Login with GitHub</Button>
    </div>
  );
}

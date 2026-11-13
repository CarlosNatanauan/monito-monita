import type { Metadata } from "next";
import { pageClass } from "@/components/page";
import { cn } from "@/lib/utils";
import { CreateGroupFlow } from "./create-group-flow";

export const metadata: Metadata = {
  title: "Create your group · Monito Monita",
};

export default function NewGroupPage() {
  return (
    <main className={cn(pageClass, "gap-6 pt-10")}>
      <CreateGroupFlow />
    </main>
  );
}

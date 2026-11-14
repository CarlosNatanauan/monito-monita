import type { Metadata } from "next";
import { widePageClass } from "@/components/page";
import { cn } from "@/lib/utils";
import { CreateGroupFlow } from "./create-group-flow";

export const metadata: Metadata = {
  title: "Create your group · Monito Monita",
};

export default function NewGroupPage() {
  return (
    <main className={cn(widePageClass, "gap-5 pt-7 md:gap-8 md:pt-12")}>
      <CreateGroupFlow />
    </main>
  );
}

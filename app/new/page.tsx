import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { LightString, pageClass } from "@/components/page";
import { cn } from "@/lib/utils";
import { CreateGroupFlow } from "./create-group-flow";

export const metadata: Metadata = {
  title: "Gumawa ng group · Monito Monita",
};

export default function NewGroupPage() {
  return (
    <>
      <LightString />
      <main className={cn(pageClass, "pt-1.5 lg:pt-3")}>
        <Brand />
        <CreateGroupFlow />
      </main>
    </>
  );
}

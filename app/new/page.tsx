import type { Metadata } from "next";
import { CreateGroupFlow } from "./create-group-flow";

export const metadata: Metadata = {
  title: "Create your group · Monito Monita",
};

export default function NewGroupPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-8 px-4 py-10">
      <CreateGroupFlow />
    </main>
  );
}

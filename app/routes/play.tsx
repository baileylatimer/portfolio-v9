import type { MetaFunction } from "@remix-run/node";
import ClientOnly from "~/components/game/ClientOnly";
import FrontierWars from "~/components/game/frontier/FrontierWars";

export const meta: MetaFunction = () => [
  { title: "Frontier Wars — Bailey Latimer" },
  { name: "description", content: "A western strategy game built into the portfolio." },
];

export default function PlayRoute() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      <ClientOnly>
        <FrontierWars />
      </ClientOnly>
    </div>
  );
}

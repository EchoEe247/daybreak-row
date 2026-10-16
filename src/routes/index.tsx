import { createFileRoute } from "@tanstack/react-router";
import { GameScreen } from "@/components/life/GameScreen";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <GameScreen />;
}

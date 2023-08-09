import Room from "./Room";
export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-start p-6"
      style={{ minHeight: "100dvh" }}
    >
      <h1 className="text-4xl font-semibold pb-6">Mosaic</h1>
      <Room roomId="test" />
    </main>
  );
}

import Board from "@/components/Board";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ヘッダー */}
      <header className="bg-[#026aa7] px-4 py-3 flex items-center gap-3 shadow-md flex-shrink-0">
        <span className="text-white font-bold text-lg tracking-wide">
          📋 Kanban Board
        </span>
      </header>

      {/* ボード */}
      <Board />
    </div>
  );
}

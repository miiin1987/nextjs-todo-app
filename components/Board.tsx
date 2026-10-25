"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import useLocalStorage from "@/hooks/useLocalStorage";

interface Card {
  id: string;
  text: string;
  createdAt: number;
}

interface Column {
  id: string;
  title: string;
  cards: Card[];
}

const DEFAULT_COLUMNS: Column[] = [
  { id: "col-todo", title: "ToDo", cards: [] },
  { id: "col-doing", title: "進行中", cards: [] },
  { id: "col-done", title: "完了", cards: [] },
];

export default function Board() {
  const [columns, setColumns, isHydrated] = useLocalStorage<Column[]>(
    "trello-board",
    DEFAULT_COLUMNS
  );
  const [addingCardToCol, setAddingCardToCol] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // ── ドラッグ終了処理 ──────────────────────────────────────────
  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    setColumns((prev) => {
      // 各列のカード配列をコピーして不変性を保つ
      const cols = prev.map((c) => ({ ...c, cards: [...c.cards] }));
      const src = cols.find((c) => c.id === source.droppableId)!;
      const dst = cols.find((c) => c.id === destination.droppableId)!;
      const [moved] = src.cards.splice(source.index, 1);
      dst.cards.splice(destination.index, 0, moved);
      return cols;
    });
  };

  // ── カード操作 ────────────────────────────────────────────────
  const addCard = (colId: string) => {
    const text = newCardText.trim();
    if (!text) return;
    setColumns((prev) =>
      prev.map((col) =>
        col.id === colId
          ? {
              ...col,
              cards: [
                ...col.cards,
                { id: crypto.randomUUID(), text, createdAt: Date.now() },
              ],
            }
          : col
      )
    );
    setNewCardText("");
    setAddingCardToCol(null);
  };

  const deleteCard = (colId: string, cardId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === colId
          ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
          : col
      )
    );
  };

  // ── 列操作 ────────────────────────────────────────────────────
  const addColumn = () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    setColumns((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title, cards: [] },
    ]);
    setNewColumnTitle("");
    setAddingColumn(false);
  };

  const deleteColumn = (colId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== colId));
  };

  // ── hydration 前はスケルトン表示 ─────────────────────────────
  if (!isHydrated) {
    return (
      <div className="flex gap-4 p-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-72 h-48 bg-white/20 rounded-xl animate-pulse flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 p-4 overflow-x-auto items-start min-h-[calc(100vh-64px)]">
        {columns.map((col) => (
          <div
            key={col.id}
            className="bg-[#ebecf0] rounded-xl w-72 flex-shrink-0 flex flex-col shadow"
          >
            {/* 列ヘッダー */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <h3 className="font-semibold text-[#172b4d] text-sm">
                {col.title}
                <span className="ml-2 text-gray-400 font-normal">
                  {col.cards.length}
                </span>
              </h3>
              <button
                onClick={() => deleteColumn(col.id)}
                aria-label="列を削除"
                className="text-gray-400 hover:text-red-500 transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {/* カード一覧 */}
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`px-2 flex-1 min-h-[4px] transition-colors rounded-lg ${
                    snapshot.isDraggingOver ? "bg-blue-100" : ""
                  }`}
                >
                  {col.cards.map((card, index) => (
                    <Draggable
                      key={card.id}
                      draggableId={card.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white rounded-lg px-3 py-2 mb-2 shadow-sm group flex items-start justify-between gap-2 cursor-grab active:cursor-grabbing transition-shadow ${
                            snapshot.isDragging
                              ? "shadow-xl rotate-1 opacity-90"
                              : "hover:shadow-md"
                          }`}
                        >
                          <span className="text-[#172b4d] text-sm break-all leading-relaxed">
                            {card.text}
                          </span>
                          <button
                            onClick={() => deleteCard(col.id, card.id)}
                            aria-label="カードを削除"
                            className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* カード追加フォーム */}
            {addingCardToCol === col.id ? (
              <div className="px-2 pb-2">
                <textarea
                  autoFocus
                  value={newCardText}
                  onChange={(e) => setNewCardText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addCard(col.id);
                    }
                    if (e.key === "Escape") {
                      setAddingCardToCol(null);
                      setNewCardText("");
                    }
                  }}
                  placeholder="カードのタイトルを入力..."
                  rows={3}
                  className="w-full p-2 text-sm rounded-lg border border-blue-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                />
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => addCard(col.id)}
                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    追加
                  </button>
                  <button
                    onClick={() => {
                      setAddingCardToCol(null);
                      setNewCardText("");
                    }}
                    className="px-2 py-1.5 text-gray-600 hover:bg-gray-200 text-sm rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAddingCardToCol(col.id);
                  setNewCardText("");
                }}
                className="mx-2 mb-2 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
              >
                + カードを追加
              </button>
            )}
          </div>
        ))}

        {/* 列追加 */}
        {addingColumn ? (
          <div className="bg-[#ebecf0] rounded-xl w-72 flex-shrink-0 p-3 shadow">
            <input
              autoFocus
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addColumn();
                if (e.key === "Escape") {
                  setAddingColumn(false);
                  setNewColumnTitle("");
                }
              }}
              placeholder="リストのタイトルを入力..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={addColumn}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                リストを追加
              </button>
              <button
                onClick={() => {
                  setAddingColumn(false);
                  setNewColumnTitle("");
                }}
                className="px-2 py-1.5 text-gray-600 hover:bg-gray-200 text-sm rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingColumn(true)}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl w-72 flex-shrink-0 px-4 py-3 text-left text-sm font-medium shadow transition-colors"
          >
            + リストを追加
          </button>
        )}
      </div>
    </DragDropContext>
  );
}

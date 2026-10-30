"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import useLocalStorage from "@/hooks/useLocalStorage";

type Priority = "高" | "中" | "低";

interface Card {
  id: string;
  text: string;
  createdAt: number;
  priority?: Priority;
  dueDate?: string; // YYYY-MM-DD
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

const PRIORITY_STYLES: Record<Priority, string> = {
  高: "bg-red-100 text-red-700 border border-red-200",
  中: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  低: "bg-blue-100 text-blue-700 border border-blue-200",
};

function getCardPriority(card: Card): Priority {
  return card.priority ?? "中";
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate + "T00:00:00") < today;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}/${m}/${d}`;
}

export default function Board() {
  const [columns, setColumns, isHydrated] = useLocalStorage<Column[]>(
    "trello-board",
    DEFAULT_COLUMNS
  );

  // 検索
  const [searchQuery, setSearchQuery] = useState("");

  // カード追加フォーム
  const [addingCardToCol, setAddingCardToCol] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState("");
  const [newCardPriority, setNewCardPriority] = useState<Priority>("中");
  const [newCardDueDate, setNewCardDueDate] = useState("");

  // 列追加フォーム
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // カード編集
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState<Priority>("中");
  const [editDueDate, setEditDueDate] = useState("");

  // ── ドラッグ終了処理 ──────────────────────────────────────────
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const query = searchQuery.trim().toLowerCase();

    setColumns((prev) => {
      const cols = prev.map((c) => ({ ...c, cards: [...c.cards] }));
      const srcCol = cols.find((c) => c.id === source.droppableId)!;
      const dstCol = cols.find((c) => c.id === destination.droppableId)!;

      // draggableId で実際のインデックスを特定（フィルター時もズレない）
      const actualSrcIdx = srcCol.cards.findIndex((c) => c.id === draggableId);
      const [movedCard] = srcCol.cards.splice(actualSrcIdx, 1);

      if (!query) {
        dstCol.cards.splice(destination.index, 0, movedCard);
      } else {
        // 検索中：フィルター後のインデックスを実際のインデックスへマッピング
        const filteredDst = dstCol.cards.filter((c) =>
          c.text.toLowerCase().includes(query)
        );
        if (filteredDst.length === 0 || destination.index >= filteredDst.length) {
          if (filteredDst.length === 0) {
            dstCol.cards.push(movedCard);
          } else {
            const last = filteredDst[filteredDst.length - 1];
            const idx = dstCol.cards.findIndex((c) => c.id === last.id);
            dstCol.cards.splice(idx + 1, 0, movedCard);
          }
        } else {
          const anchor = filteredDst[destination.index];
          const anchorIdx = dstCol.cards.findIndex((c) => c.id === anchor.id);
          dstCol.cards.splice(anchorIdx, 0, movedCard);
        }
      }

      return cols;
    });
  };

  // ── カード追加 ────────────────────────────────────────────────
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
                {
                  id: crypto.randomUUID(),
                  text,
                  createdAt: Date.now(),
                  priority: newCardPriority,
                  dueDate: newCardDueDate || undefined,
                },
              ],
            }
          : col
      )
    );
    setNewCardText("");
    setNewCardPriority("中");
    setNewCardDueDate("");
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

  // ── カード編集 ────────────────────────────────────────────────
  const startEditCard = (card: Card) => {
    setEditingCardId(card.id);
    setEditPriority(getCardPriority(card));
    setEditDueDate(card.dueDate ?? "");
  };

  const saveEditCard = (colId: string, cardId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === colId
          ? {
              ...col,
              cards: col.cards.map((c) =>
                c.id === cardId
                  ? { ...c, priority: editPriority, dueDate: editDueDate || undefined }
                  : c
              ),
            }
          : col
      )
    );
    setEditingCardId(null);
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

  // ── 検索フィルター ────────────────────────────────────────────
  const query = searchQuery.trim().toLowerCase();
  const displayColumns = query
    ? columns.map((col) => ({
        ...col,
        cards: col.cards.filter((card) =>
          card.text.toLowerCase().includes(query)
        ),
      }))
    : columns;

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
    <div className="flex flex-col flex-1">
      {/* 検索バー */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setEditingCardId(null);
            }}
            placeholder="カードを検索..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-blue-300 bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="検索をクリア"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 w-5 h-5 flex items-center justify-center rounded transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        {query && (
          <p className="mt-1 text-xs text-white/70">
            「{searchQuery}」で絞り込み中 —{" "}
            {displayColumns.reduce((sum, col) => sum + col.cards.length, 0)} 件一致
          </p>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 p-4 overflow-x-auto items-start flex-1 min-h-0">
          {displayColumns.map((col) => (
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
                    {col.cards.map((card, index) => {
                      const priority = getCardPriority(card);
                      const overdue = isOverdue(card.dueDate);
                      const isEditing = editingCardId === card.id;

                      return (
                        <Draggable
                          key={card.id}
                          draggableId={card.id}
                          index={index}
                          isDragDisabled={isEditing}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg px-3 py-2 mb-2 shadow-sm group transition-shadow ${
                                snapshot.isDragging
                                  ? "shadow-xl rotate-1 opacity-90"
                                  : "hover:shadow-md"
                              } ${isEditing ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
                            >
                              {/* 優先度バッジ + テキスト + 削除 */}
                              <div className="flex items-start gap-2">
                                <span
                                  className={`text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${PRIORITY_STYLES[priority]}`}
                                >
                                  {priority}
                                </span>
                                <span className="text-[#172b4d] text-sm break-all leading-relaxed flex-1">
                                  {card.text}
                                </span>
                                <button
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCard(col.id, card.id);
                                  }}
                                  aria-label="カードを削除"
                                  className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                                >
                                  ✕
                                </button>
                              </div>

                              {/* 期限表示 */}
                              {card.dueDate && (
                                <div
                                  className={`mt-1 text-xs flex items-center gap-1 ${
                                    overdue
                                      ? "text-red-600 font-medium"
                                      : "text-gray-400"
                                  }`}
                                >
                                  <span>{overdue ? "⚠️" : "📅"}</span>
                                  <span>{formatDate(card.dueDate)}</span>
                                  {overdue && <span>（期限切れ）</span>}
                                </div>
                              )}

                              {/* 編集パネル */}
                              {isEditing ? (
                                <div
                                  className="mt-2 pt-2 border-t border-gray-100 space-y-2"
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  {/* 優先度選択 */}
                                  <div>
                                    <p className="text-xs text-gray-400 mb-1">優先度</p>
                                    <div className="flex gap-1">
                                      {(["高", "中", "低"] as Priority[]).map((p) => (
                                        <button
                                          key={p}
                                          onClick={() => setEditPriority(p)}
                                          className={`flex-1 text-xs py-1 rounded border font-semibold transition-colors ${
                                            editPriority === p
                                              ? PRIORITY_STYLES[p]
                                              : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                                          }`}
                                        >
                                          {p}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  {/* 期限入力 */}
                                  <div>
                                    <p className="text-xs text-gray-400 mb-1">期限</p>
                                    <input
                                      type="date"
                                      value={editDueDate}
                                      onChange={(e) => setEditDueDate(e.target.value)}
                                      className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                    {editDueDate && (
                                      <button
                                        onClick={() => setEditDueDate("")}
                                        className="text-xs text-gray-400 hover:text-red-400 mt-0.5 transition-colors"
                                      >
                                        期限を削除
                                      </button>
                                    )}
                                  </div>
                                  {/* 保存 / キャンセル */}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => saveEditCard(col.id, card.id)}
                                      className="flex-1 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors font-medium"
                                    >
                                      保存
                                    </button>
                                    <button
                                      onClick={() => setEditingCardId(null)}
                                      className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors"
                                    >
                                      キャンセル
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditCard(card);
                                  }}
                                  className="mt-1 text-xs text-gray-300 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity block"
                                >
                                  ✎ 編集
                                </button>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* カード追加フォーム（検索中は非表示） */}
              {!query &&
                (addingCardToCol === col.id ? (
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
                    {/* 優先度 */}
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-gray-500">優先度：</span>
                      {(["高", "中", "低"] as Priority[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setNewCardPriority(p)}
                          className={`text-xs px-2 py-0.5 rounded border font-semibold transition-colors ${
                            newCardPriority === p
                              ? PRIORITY_STYLES[p]
                              : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    {/* 期限 */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-gray-500 flex-shrink-0">期限：</span>
                      <input
                        type="date"
                        value={newCardDueDate}
                        onChange={(e) => setNewCardDueDate(e.target.value)}
                        className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
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
                          setNewCardPriority("中");
                          setNewCardDueDate("");
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
                ))}
            </div>
          ))}

          {/* 列追加（検索中は非表示） */}
          {!query &&
            (addingColumn ? (
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
            ))}
        </div>
      </DragDropContext>
    </div>
  );
}

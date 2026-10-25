"use client";

import { useState, FormEvent } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

const STORAGE_KEY = "todos";

export default function TodoList() {
  const [todos, setTodos, isHydrated] = useLocalStorage<Todo[]>(
    STORAGE_KEY,
    []
  );
  const [inputText, setInputText] = useState("");

  const addTodo = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    };
    setTodos((prev) => [newTodo, ...prev]);
    setInputText("");
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((todo) => !todo.completed));
  };

  const remaining = todos.filter((t) => !t.completed).length;
  const completedCount = todos.length - remaining;

  // SSR/hydration 前はスケルトンを表示してハイドレーションエラーを防ぐ
  if (!isHydrated) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 bg-gray-200 rounded-lg" />
        <div className="h-10 bg-gray-200 rounded-lg" />
        <div className="h-10 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 入力フォーム */}
      <form onSubmit={addTodo} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="新しいタスクを入力..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          追加
        </button>
      </form>

      {/* 統計バー */}
      {todos.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 px-1">
          <span>{remaining} 件が残り</span>
          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              完了済みを削除 ({completedCount})
            </button>
          )}
        </div>
      )}

      {/* タスクリスト */}
      {todos.length === 0 ? (
        <p className="text-center text-gray-400 py-12">
          タスクがありません。上から追加してください。
        </p>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="w-5 h-5 accent-blue-500 cursor-pointer flex-shrink-0"
              />
              <span
                className={`flex-1 text-gray-800 break-all ${
                  todo.completed ? "line-through text-gray-400" : ""
                }`}
              >
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                aria-label="削除"
                className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none flex-shrink-0"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

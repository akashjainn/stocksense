"use client";
import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

type SearchItem = {
  symbol: string;
  name: string;
  exchange: string;
  type?: string;
};

interface SearchAutocompleteProps {
  onSelect: (symbol: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchAutocomplete({ 
  onSelect, 
  placeholder = "Search by symbol or company", 
  className = "" 
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) {
      setItems([]);
      setIsOpen(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/market/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (!response.ok) throw new Error("Search failed");
        
        const results = await response.json();
        setItems(results || []);
        setIsOpen(results?.length > 0);
      } catch (error) {
        console.error("Search error:", error);
        setItems([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleSelect = (item: SearchItem) => {
    setQuery(item.symbol);
    setIsOpen(false);
    onSelect(item.symbol);
  };

  const handleInputFocus = () => {
    if (items.length > 0) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          aria-label="Search stocks"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {isOpen && items.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600 shadow-lg max-h-80 overflow-auto">
          {items.map((item, index) => (
            <button
              key={`${item.symbol}-${item.exchange}-${index}`}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
              onClick={() => handleSelect(item)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {item.symbol}
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
                      {item.exchange}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {item.name}
                  </div>
                </div>
                {item.type && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                    {item.type}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && !loading && items.length === 0 && debouncedQuery && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600 shadow-lg">
          <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
            No results found for &quot;{debouncedQuery}&quot;
          </div>
        </div>
      )}
    </div>
  );
}
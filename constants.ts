import { ChatSession } from './types';

export const SUGGESTED_PROMPTS: readonly string[] = [
  'Plan a weekend trip to Paris',
  'Explain quantum physics simply',
  'Write a python script for web scraping',
  'Give me a healthy dinner recipe',
];

export const MOCK_CHATS: ChatSession[] = [
  {
    id: 'chat-1',
    title: 'React Performance Tips',
    isPinned: true,
    updatedAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
    messages: [
      { id: 'm1', role: 'user', content: 'How can I optimize a large list in React?', timestamp: Date.now() - 1000 * 60 * 60 },
      { id: 'm2', role: 'ai', content: 'For large lists in React, you should consider using virtualization. Libraries like `react-window` or `react-virtualized` only render the items currently visible in the viewport, drastically reducing DOM nodes and improving performance.', timestamp: Date.now() - 1000 * 60 * 59 },
    ]
  },
  {
    id: 'chat-2',
    title: 'Dinner Recipes',
    isPinned: true,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    messages: [
      { id: 'm3', role: 'user', content: 'Give me a quick vegetarian dinner recipe.', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
      { id: 'm4', role: 'ai', content: 'How about a quick Chickpea and Spinach Curry? It takes about 20 minutes. You just need canned chickpeas, fresh spinach, coconut milk, and some basic curry spices. Sauté onions and garlic, add spices, pour in coconut milk and chickpeas, simmer, and stir in spinach at the end!', timestamp: Date.now() - 1000 * 60 * 60 * 23.9 },
    ]
  },
  {
    id: 'chat-3',
    title: 'Explain Quantum Computing',
    isPinned: false,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    messages: [
      { id: 'm5', role: 'user', content: 'Explain quantum computing like I am 5.', timestamp: Date.now() - 1000 * 60 * 60 * 48 },
      { id: 'm6', role: 'ai', content: 'Imagine you have a magic coin. A normal coin is either heads or tails. But this magic coin, while it\'s spinning in the air, is kind of both heads and tails at the same time. Quantum computers use "magic coins" called qubits to solve certain very hard puzzles much faster than normal computers!', timestamp: Date.now() - 1000 * 60 * 60 * 47.9 },
    ]
  },
  {
    id: 'chat-4',
    title: 'Travel Itinerary: Japan',
    isPinned: false,
    updatedAt: Date.now() - 1000 * 60 * 60 * 72,
    messages: []
  }
];


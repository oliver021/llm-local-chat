import type { ProviderKey } from '../hooks/useProvider';

export interface ModelInfo {
  id: string;             // value passed to the service as `model`
  name: string;           // human-readable display name
  size?: string;          // e.g. '7B', '13B', '4.1 GB'
  quantization?: string;  // e.g. 'Q4_K_M', 'fp16'
  source: 'local' | 'huggingface' | 'openai' | 'anthropic' | 'ollama-registry';
  installed?: boolean;    // for Ollama: whether the model is already pulled
  // HuggingFace-specific enrichment
  downloads?: number;     // raw download count from HF API
  likes?: number;         // likes count from HF API
  hfRepoId?: string;      // e.g. "bartowski/Llama-3.2-1B-Instruct-GGUF"
  downloadUrl?: string;   // direct CDN URL: https://huggingface.co/{repo}/resolve/main/{file}
  authorAvatar?: string;  // https://huggingface.co/{author}/avatar
  allVariants?: ModelInfo[]; // other GGUF files in the same repo (different quantizations)
}

export interface HFModelDetail {
  id: string;
  pipeline_tag?: string;
  tags: string[];
  lastModified: string;
  likes: number;
  downloads: number;
  siblings: Array<{ rfilename: string; size?: number }>;
  cardData?: {
    license?: string;
    language?: string[];
  };
}

/** Known high-quality GGUF quantizers that target llama.cpp compatibility */
export const TRUSTED_AUTHORS = ['bartowski', 'unsloth', 'QuantFactory', 'mradermacher', 'TheBloke'] as const;

/**
 * Fetch full detail for a single HF model repo.
 * The individual model endpoint always includes `siblings` and `cardData`.
 */
export async function fetchHFModelDetail(repoId: string): Promise<HFModelDetail> {
  const res = await fetch(
    `https://huggingface.co/api/models/${repoId}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`HF API ${res.status}`);
  return res.json();
}

// ── llama.cpp ──────────────────────────────────────────────────────────────────

export async function discoverLlamaCppModels(): Promise<ModelInfo[]> {
  const local = await fetchLlamaServerModels();
  const hf = await fetchHuggingFaceGGUFs();

  // Deduplicate: if a HF model id already appears in local list, skip it
  const localIds = new Set(local.map((m) => m.id));
  const hfFiltered = hf.filter((m) => !localIds.has(m.id));

  return [...local, ...hfFiltered];
}

export async function fetchLlamaServerModels(): Promise<ModelInfo[]> {
  try {
    const res = await fetch('/v1/models');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).map((m: { id: string }) => ({
      id: m.id,
      name: m.id,
      source: 'local' as const,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch GGUF models from HuggingFace.
 * When `query` is provided, adds `?search={query}` to the request.
 * Each HF repo is returned as a single ModelInfo card; additional quantization
 * files are stored in `allVariants`.
 */
export async function fetchHuggingFaceGGUFs(query = ''): Promise<ModelInfo[]> {
  try {
    const params = new URLSearchParams({
      library: 'gguf',
      sort: 'downloads',
      direction: '-1',
      limit: '20',
    });
    if (query.trim()) params.set('search', query.trim());

    const res = await fetch(
      `https://huggingface.co/api/models?${params.toString()}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const models: HFModel[] = await res.json();

    return models.flatMap((m) => {
      const author = m.id.split('/')[0] ?? m.id;
      const repoName = m.id.split('/')[1] ?? m.id;
      const authorAvatar = `https://huggingface.co/${author}/avatar`;

      // The list endpoint does NOT include `siblings` by default.
      // When file info is available, build per-file variant cards.
      // When absent, fall back to a repo-level card — the model is still shown.
      const ggufFiles = (m.siblings ?? []).filter((s) => s.rfilename?.endsWith('.gguf'));

      if (ggufFiles.length === 0) {
        // Repo-level card: no per-file detail, link to HF model page
        return [{
          id: m.id,
          name: repoName,
          source: 'huggingface' as const,
          downloads: m.downloads,
          likes: m.likes,
          hfRepoId: m.id,
          downloadUrl: `https://huggingface.co/${m.id}`,
          authorAvatar,
        }];
      }

      // Build a ModelInfo for each GGUF file, then pick the best primary
      const variants: ModelInfo[] = ggufFiles.map((file) => {
        const sizeMB = file.size ? Math.round(file.size / 1024 / 1024) : undefined;
        const sizeStr = sizeMB
          ? sizeMB > 1024
            ? `${(sizeMB / 1024).toFixed(1)} GB`
            : `${sizeMB} MB`
          : undefined;
        return {
          id: file.rfilename,
          name: repoName,
          size: sizeStr,
          quantization: extractQuantization(file.rfilename),
          source: 'huggingface' as const,
          downloads: m.downloads,
          likes: m.likes,
          hfRepoId: m.id,
          downloadUrl: `https://huggingface.co/${m.id}/resolve/main/${file.rfilename}`,
          authorAvatar,
        };
      });

      // Prefer Q4_K_M as the representative; fall back to first
      const primaryIdx = variants.findIndex((v) => v.quantization === 'Q4_K_M');
      const best = primaryIdx >= 0 ? primaryIdx : 0;
      const primary = { ...variants[best] };
      primary.allVariants = variants.filter((_, i) => i !== best);

      return [primary];
    });
  } catch {
    return [];
  }
}

interface HFModel {
  id: string;
  downloads: number;
  likes: number;
  siblings?: Array<{ rfilename: string; size?: number }>;
}

function extractQuantization(filename: string): string | undefined {
  const match = filename.match(/[Qq][0-9][_KMkm0-9]*/);
  return match ? match[0].toUpperCase() : undefined;
}

/** Format raw download count to human-readable string: 1234567 → "1.2M" */
export function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ── OpenAI ─────────────────────────────────────────────────────────────────────

export async function discoverOpenAiModels(): Promise<ModelInfo[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not set — add it to .env.local');
  }

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);

    const data = await res.json();
    const chatModels: Array<{ id: string; created: number }> = (data.data ?? [])
      .filter((m: { id: string }) =>
        m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3')
      )
      .sort((a: { created: number }, b: { created: number }) => b.created - a.created);

    return chatModels.map((m) => ({
      id: m.id,
      name: m.id,
      source: 'openai' as const,
    }));
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// ── Anthropic ──────────────────────────────────────────────────────────────────

export async function discoverClaudeModels(): Promise<ModelInfo[]> {
  // Anthropic has no public model-listing endpoint — return known models
  return [
    { id: 'claude-opus-4-7',           name: 'Claude Opus 4.7',  source: 'anthropic' },
    { id: 'claude-sonnet-4-6',         name: 'Claude Sonnet 4.6', source: 'anthropic' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5',  source: 'anthropic' },
  ];
}

// ── Ollama ─────────────────────────────────────────────────────────────────────

/** Model returned by the Ollama local server's /api/tags endpoint */
export interface OllamaInstalledModel {
  name: string;       // e.g. "llama3.1:8b"
  model: string;      // same as name in newer versions
  size: number;       // bytes on disk
  digest: string;
  modified_at: string;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

/** Model returned by the Ollama public registry search */
export interface OllamaRegistryEntry {
  name: string;        // e.g. "llama3.1"
  description: string;
  pulls: number;
  tags: number;        // count of available tag variants
  updated_at: string;
}

/**
 * Fetch locally installed Ollama models from the running Ollama server.
 * Returns rich detail including disk size, family and quantization level.
 */
export async function fetchOllamaInstalledModels(): Promise<OllamaInstalledModel[]> {
  try {
    const res = await fetch('/ollama/api/tags', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.models ?? [];
  } catch {
    return [];
  }
}

/**
 * Curated Ollama registry — ollama.com has no public JSON API and the local
 * server has no search endpoint, so we maintain this list ourselves.
 * Search is done client-side (instant, offline-capable).
 * Sorted by popularity. Pull counts are approximate at time of writing.
 */
const OLLAMA_LIBRARY: OllamaRegistryEntry[] = [
  { name: 'llama3.3',          description: "Meta Llama 3.3 70B — best open-weight model for its size.",                         pulls: 8_500_000,  tags: 4,  updated_at: '2024-12-06' },
  { name: 'llama3.2',          description: "Meta Llama 3.2 with 1B and 3B lightweight models including multimodal vision.",     pulls: 22_000_000, tags: 18, updated_at: '2024-09-25' },
  { name: 'llama3.1',          description: "Meta Llama 3.1 in 8B, 70B and 405B. Strong reasoning and instruction following.",   pulls: 40_000_000, tags: 26, updated_at: '2024-07-23' },
  { name: 'llama3',            description: "Meta Llama 3 — 8B and 70B models with strong instruction following.",               pulls: 33_000_000, tags: 14, updated_at: '2024-04-18' },
  { name: 'qwen3',             description: "Alibaba Qwen3 with thinking mode. 0.6B to 235B MoE variants.",                     pulls: 6_200_000,  tags: 28, updated_at: '2025-04-28' },
  { name: 'qwen2.5',           description: "Alibaba Qwen 2.5 in 0.5B-72B. Excellent coding and multilingual support.",         pulls: 19_000_000, tags: 42, updated_at: '2024-09-19' },
  { name: 'qwen2.5-coder',     description: "Qwen 2.5 Coder — dedicated coding model in 1.5B, 7B, 14B, 32B.",                  pulls: 7_800_000,  tags: 20, updated_at: '2024-11-12' },
  { name: 'mistral',           description: "Mistral 7B — fast, efficient, very capable. The classic open-weight model.",        pulls: 28_000_000, tags: 10, updated_at: '2024-07-10' },
  { name: 'mistral-nemo',      description: "Mistral NeMo 12B by Mistral AI and NVIDIA. Long context (128k).",                  pulls: 5_000_000,  tags: 6,  updated_at: '2024-07-18' },
  { name: 'mistral-small',     description: "Mistral Small 3.1 — 24B, competitive with larger models at lower cost.",           pulls: 2_400_000,  tags: 6,  updated_at: '2025-03-17' },
  { name: 'phi4',              description: "Microsoft Phi-4 14B — exceptional reasoning for its size.",                         pulls: 9_000_000,  tags: 8,  updated_at: '2024-12-12' },
  { name: 'phi4-mini',         description: "Microsoft Phi-4 Mini 3.8B — compact but strong at math and reasoning.",            pulls: 2_100_000,  tags: 4,  updated_at: '2025-02-06' },
  { name: 'phi3',              description: "Microsoft Phi-3 Mini/Medium/Small — efficient small language models.",              pulls: 16_000_000, tags: 14, updated_at: '2024-05-23' },
  { name: 'gemma3',            description: "Google Gemma 3 in 1B, 4B, 12B, 27B. Strong multilingual and vision support.",      pulls: 11_000_000, tags: 22, updated_at: '2025-03-12' },
  { name: 'gemma2',            description: "Google Gemma 2 in 2B, 9B, 27B. Excellent quality for the size.",                  pulls: 14_000_000, tags: 14, updated_at: '2024-06-27' },
  { name: 'deepseek-r1',       description: "DeepSeek-R1 reasoning model — matches o1 on benchmarks. 1.5B to 671B.",            pulls: 18_000_000, tags: 24, updated_at: '2025-01-20' },
  { name: 'deepseek-v3',       description: "DeepSeek-V3 685B MoE — frontier model rivaling GPT-4o.",                          pulls: 4_500_000,  tags: 4,  updated_at: '2025-01-27' },
  { name: 'deepseek-coder-v2', description: "DeepSeek Coder V2 — strong coding and math. 16B and 236B MoE.",                   pulls: 3_200_000,  tags: 8,  updated_at: '2024-06-17' },
  { name: 'codellama',         description: "Meta Code Llama — code generation in 7B to 70B with instruction tuning.",          pulls: 17_000_000, tags: 20, updated_at: '2024-01-29' },
  { name: 'codegemma',         description: "Google CodeGemma — 7B code generation and completion model.",                      pulls: 6_300_000,  tags: 10, updated_at: '2024-04-09' },
  { name: 'starcoder2',        description: "BigCode StarCoder2 — 3B, 7B and 15B code models trained on 600+ languages.",       pulls: 2_900_000,  tags: 10, updated_at: '2024-02-28' },
  { name: 'nomic-embed-text',  description: "Nomic 768-dim text embeddings — for RAG and semantic search.",                     pulls: 14_000_000, tags: 4,  updated_at: '2024-02-06' },
  { name: 'mxbai-embed-large', description: "MixedBread large embeddings — state-of-the-art 1024-dim.",                        pulls: 7_000_000,  tags: 4,  updated_at: '2024-03-07' },
  { name: 'llava',             description: "LLaVA multimodal — image + text understanding, 7B to 34B.",                        pulls: 12_000_000, tags: 18, updated_at: '2024-03-05' },
  { name: 'llava-llama3',      description: "LLaVA fine-tuned on Llama 3 — strong vision-language model.",                      pulls: 2_700_000,  tags: 4,  updated_at: '2024-05-08' },
  { name: 'moondream',         description: "Moondream 2 — tiny 1.8B vision model for edge devices.",                           pulls: 4_100_000,  tags: 6,  updated_at: '2024-03-04' },
  { name: 'dolphin3',          description: "Dolphin 3 uncensored 8B — fine-tuned on Llama 3.1 for instruction following.",     pulls: 3_500_000,  tags: 6,  updated_at: '2025-01-17' },
  { name: 'command-r',         description: "Cohere Command R 35B — retrieval-augmented generation specialist.",                 pulls: 3_100_000,  tags: 6,  updated_at: '2024-03-11' },
  { name: 'command-r-plus',    description: "Cohere Command R+ 104B — enterprise RAG model.",                                   pulls: 1_800_000,  tags: 4,  updated_at: '2024-04-04' },
  { name: 'solar-pro',         description: "Upstage Solar Pro 22B — strong instruction tuning, context 4096.",                 pulls: 1_200_000,  tags: 4,  updated_at: '2024-09-30' },
  { name: 'yi',                description: "01-AI Yi 6B and 34B — multilingual models with long context.",                     pulls: 4_800_000,  tags: 14, updated_at: '2024-01-16' },
  { name: 'vicuna',            description: "Vicuna 7B/13B — classic fine-tuned LLaMA model, great for chat.",                  pulls: 6_500_000,  tags: 10, updated_at: '2024-01-18' },
  { name: 'orca-mini',         description: "Orca Mini 3B/7B/13B — efficient explanation-tuned models.",                        pulls: 5_200_000,  tags: 8,  updated_at: '2024-01-16' },
  { name: 'tinyllama',         description: "TinyLlama 1.1B — smallest Llama-compatible model, runs on any hardware.",          pulls: 8_200_000,  tags: 6,  updated_at: '2024-01-25' },
  { name: 'smollm2',           description: "HuggingFace SmolLM2 135M-1.7B — ultra-compact on-device language models.",        pulls: 2_600_000,  tags: 12, updated_at: '2024-11-02' },
];

/**
 * Search the curated Ollama library client-side — instant, no network call.
 * Ollama.com has no public JSON API and the local server has no search endpoint.
 * Matches against model name and description (case-insensitive).
 */
export function fetchOllamaRegistry(query = ''): Promise<OllamaRegistryEntry[]> {
  const q = query.trim().toLowerCase();
  const results = q
    ? OLLAMA_LIBRARY.filter(
        (m) => m.name.includes(q) || m.description.toLowerCase().includes(q)
      )
    : OLLAMA_LIBRARY;
  return Promise.resolve(results);
}

const OLLAMA_REGISTRY_MODELS: ModelInfo[] = [
  { id: 'llama3.1',       name: 'LLaMA 3.1 (8B)',       size: '4.7 GB',  source: 'ollama-registry' },
  { id: 'llama3.1:70b',   name: 'LLaMA 3.1 (70B)',      size: '40 GB',   source: 'ollama-registry' },
  { id: 'mistral',        name: 'Mistral (7B)',           size: '4.1 GB',  source: 'ollama-registry' },
  { id: 'mistral-nemo',   name: 'Mistral Nemo (12B)',    size: '7.1 GB',  source: 'ollama-registry' },
  { id: 'qwen2.5',        name: 'Qwen 2.5 (7B)',         size: '4.4 GB',  source: 'ollama-registry' },
  { id: 'qwen2.5:14b',    name: 'Qwen 2.5 (14B)',        size: '9 GB',    source: 'ollama-registry' },
  { id: 'phi4',           name: 'Phi-4 (14B)',            size: '9.1 GB',  source: 'ollama-registry' },
  { id: 'gemma3',         name: 'Gemma 3 (4B)',           size: '3.3 GB',  source: 'ollama-registry' },
  { id: 'codellama',      name: 'Code Llama (7B)',        size: '3.8 GB',  source: 'ollama-registry' },
  { id: 'deepseek-r1',    name: 'DeepSeek R1 (7B)',       size: '4.7 GB',  source: 'ollama-registry' },
];

export async function discoverOllamaModels(): Promise<ModelInfo[]> {
  try {
    const res = await fetch('/ollama/api/tags', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return OLLAMA_REGISTRY_MODELS;

    const data = await res.json();
    const installedIds = new Set<string>();

    const installed: ModelInfo[] = (data.models ?? []).map(
      (m: { name: string; size?: number }) => {
        installedIds.add(m.name);
        const sizeMB = m.size ? Math.round(m.size / 1024 / 1024) : undefined;
        const sizeStr = sizeMB
          ? sizeMB > 1024
            ? `${(sizeMB / 1024).toFixed(1)} GB`
            : `${sizeMB} MB`
          : undefined;
        return {
          id: m.name,
          name: m.name,
          size: sizeStr,
          source: 'local' as const,
          installed: true,
        };
      }
    );

    // Show registry models that aren't already installed
    const notInstalled = OLLAMA_REGISTRY_MODELS.filter((m) => !installedIds.has(m.id));

    return [...installed, ...notInstalled];
  } catch {
    return OLLAMA_REGISTRY_MODELS;
  }
}

// ── Public dispatcher ──────────────────────────────────────────────────────────

export async function discoverModels(provider: ProviderKey): Promise<ModelInfo[]> {
  switch (provider) {
    case 'llm-llamacpp': return discoverLlamaCppModels();
    case 'llm-openai':   return discoverOpenAiModels();
    case 'llm-claude':   return discoverClaudeModels();
    case 'llm-ollama':   return discoverOllamaModels();
  }
}

// ── Connection status check ────────────────────────────────────────────────────

export type ConnectionStatus = 'connected' | 'no-key' | 'offline' | 'unknown';

export async function checkProviderStatus(provider: ProviderKey): Promise<ConnectionStatus> {
  try {
    switch (provider) {
      case 'llm-llamacpp': {
        const res = await fetch('/v1/models', { signal: AbortSignal.timeout(2000) });
        return res.ok ? 'connected' : 'offline';
      }
      case 'llm-openai':
        return import.meta.env.VITE_OPENAI_API_KEY ? 'connected' : 'no-key';

      case 'llm-claude':
        return import.meta.env.VITE_ANTHROPIC_API_KEY ? 'connected' : 'no-key';

      case 'llm-ollama': {
        const res = await fetch('/ollama/api/tags', { signal: AbortSignal.timeout(2000) });
        return res.ok ? 'connected' : 'offline';
      }
    }
  } catch {
    return 'offline';
  }
}

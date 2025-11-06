/**
 * Graph Generation Functions
 * Implements various random and structured graph generation algorithms
 */

import type { Graph } from "./utils.ts";

/**
 * Seeded random number generator for reproducible graphs
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * Parameter types for each generator
 */
export type GraphGeneratorParams = {
  nodes?: number;
  probability?: number;
  edgesPerNode?: number;
  neighbors?: number;
  beta?: number;
  communities?: number;
  nodesPerCommunity?: number;
  intraProb?: number;
  interProb?: number;
  n1?: number;
  n2?: number;
  rows?: number;
  cols?: number;
  depth?: number;
  communitySize?: number;
  pathLength?: number;
  seed?: number;
};

/**
 * Validate required parameters exist
 */
function validateParams(
  params: GraphGeneratorParams,
  required: (keyof GraphGeneratorParams)[]
): void {
  const missing = required.filter((key) => params[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }
}

/**
 * Graph generator function type
 */
export type GraphGeneratorFunction = (params: GraphGeneratorParams) => Graph;

/**
 * Erdős-Rényi Random Graph G(n, p)
 * Each possible edge exists with probability p
 */
export function generateErdosRenyiGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["nodes", "probability"]);

  const { nodes: n, probability: p, seed } = params;
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  const random = () => (rng ? rng.next() : Math.random());

  const nodes = Array.from({ length: n! }, (_, i) => i);
  const edges: [number, number][] = [];

  for (let i = 0; i < n!; i++) {
    for (let j = 0; j < n!; j++) {
      if (i !== j && random() < p!) {
        edges.push([i, j]);
      }
    }
  }

  return { nodes, edges };
}

/**
 * Barabási-Albert Scale-Free Network
 * Preferential attachment: new nodes connect to existing nodes with probability proportional to degree
 */
export function generateScaleFreeGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["nodes", "edgesPerNode"]);

  let { nodes: n, edgesPerNode: m, seed } = params;
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  const random = () => (rng ? rng.next() : Math.random());

  if (m! >= n!) m = Math.max(1, n! - 1);

  const nodes = Array.from({ length: n! }, (_, i) => i);
  const edges: [number, number][] = [];
  const degrees = new Array(n!).fill(0);

  // Start with a small complete graph
  const initial = Math.min(m! + 1, n!);
  for (let i = 0; i < initial; i++) {
    for (let j = i + 1; j < initial; j++) {
      edges.push([i, j]);
      edges.push([j, i]);
      degrees[i]++;
      degrees[j]++;
    }
  }

  // Add remaining nodes with preferential attachment
  for (let i = initial; i < n!; i++) {
    const targets = new Set<number>();
    const totalDegree = degrees.slice(0, i).reduce((a, b) => a + b, 0);

    if (totalDegree === 0) {
      // If no edges yet, connect to random nodes
      while (targets.size < m! && targets.size < i) {
        const target = Math.floor(random() * i);
        targets.add(target);
      }
    } else {
      // Preferential attachment
      while (targets.size < m! && targets.size < i) {
        let r = random() * totalDegree;
        for (let j = 0; j < i; j++) {
          r -= degrees[j];
          if (r <= 0 && !targets.has(j)) {
            targets.add(j);
            break;
          }
        }
      }
    }

    targets.forEach((target) => {
      edges.push([i, target]);
      edges.push([target, i]);
      degrees[i]++;
      degrees[target]++;
    });
  }

  return { nodes, edges };
}

/**
 * Watts-Strogatz Small-World Network
 * Start with ring lattice, then rewire edges with probability beta
 */
export function generateSmallWorldGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["nodes", "neighbors", "beta"]);

  let { nodes: n, neighbors: k, beta, seed } = params;
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  const random = () => (rng ? rng.next() : Math.random());
  const randomInt = (max: number) =>
    rng ? rng.nextInt(max) : Math.floor(Math.random() * max);

  if (k! >= n!) k = Math.max(2, n! - 1);
  if (k! % 2 !== 0) k = k! - 1; // k must be even

  const nodes = Array.from({ length: n! }, (_, i) => i);
  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();

  // Create ring lattice
  for (let i = 0; i < n!; i++) {
    for (let j = 1; j <= k! / 2; j++) {
      const target = (i + j) % n!;
      const edgeKey1 = `${i}-${target}`;
      const edgeKey2 = `${target}-${i}`;

      if (!edgeSet.has(edgeKey1)) {
        edges.push([i, target]);
        edgeSet.add(edgeKey1);
      }
      if (!edgeSet.has(edgeKey2)) {
        edges.push([target, i]);
        edgeSet.add(edgeKey2);
      }
    }
  }

  // Rewire edges
  const edgesToRewire = [...edges];
  edgesToRewire.forEach(([from, to]) => {
    if (random() < beta!) {
      let newTarget = randomInt(n!);
      let attempts = 0;
      while (
        (newTarget === from || edgeSet.has(`${from}-${newTarget}`)) &&
        attempts < 100
      ) {
        newTarget = randomInt(n!);
        attempts++;
      }

      if (attempts < 100) {
        // Remove old edge
        const oldKey = `${from}-${to}`;
        edgeSet.delete(oldKey);
        const idx = edges.findIndex((e) => e[0] === from && e[1] === to);
        if (idx !== -1) edges.splice(idx, 1);

        // Add new edge
        const newKey = `${from}-${newTarget}`;
        edges.push([from, newTarget]);
        edgeSet.add(newKey);
      }
    }
  });

  return { nodes, edges };
}

/**
 * Multi-Community Graph
 * Multiple dense clusters with sparse inter-cluster connections
 */
export function generateMultiCommunityGraph(
  params: GraphGeneratorParams
): Graph {
  validateParams(params, [
    "communities",
    "nodesPerCommunity",
    "intraProb",
    "interProb",
  ]);

  const {
    communities: numCommunities,
    nodesPerCommunity,
    intraProb: intraProbability,
    interProb: interProbability,
    seed,
  } = params;
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  const random = () => (rng ? rng.next() : Math.random());

  const n = numCommunities! * nodesPerCommunity!;
  const nodes = Array.from({ length: n }, (_, i) => i);
  const edges: [number, number][] = [];

  // Add intra-community edges
  for (let c = 0; c < numCommunities!; c++) {
    const start = c * nodesPerCommunity!;
    const end = start + nodesPerCommunity!;

    for (let i = start; i < end; i++) {
      for (let j = start; j < end; j++) {
        if (i !== j && random() < intraProbability!) {
          edges.push([i, j]);
        }
      }
    }
  }

  // Add inter-community edges
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const communityI = Math.floor(i / nodesPerCommunity!);
        const communityJ = Math.floor(j / nodesPerCommunity!);

        if (communityI !== communityJ && random() < interProbability!) {
          edges.push([i, j]);
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Directed Acyclic Graph (DAG)
 * Edges only go from lower to higher numbered nodes
 */
export function generateDAG(params: GraphGeneratorParams): Graph {
  validateParams(params, ["nodes", "probability"]);

  const { nodes: n, probability: p, seed } = params;
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  const random = () => (rng ? rng.next() : Math.random());

  const nodes = Array.from({ length: n! }, (_, i) => i);
  const edges: [number, number][] = [];

  for (let i = 0; i < n!; i++) {
    for (let j = i + 1; j < n!; j++) {
      if (random() < p!) {
        edges.push([i, j]);
      }
    }
  }

  return { nodes, edges };
}

/**
 * Bipartite Graph
 * Two sets of nodes with edges only between sets
 */
export function generateBipartiteGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["n1", "n2", "probability"]);

  const { n1, n2, probability: p, seed } = params;
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  const random = () => (rng ? rng.next() : Math.random());

  const nodes = Array.from({ length: n1! + n2! }, (_, i) => i);
  const edges: [number, number][] = [];

  for (let i = 0; i < n1!; i++) {
    for (let j = n1!; j < n1! + n2!; j++) {
      if (random() < p!) {
        edges.push([i, j]);
        edges.push([j, i]);
      }
    }
  }

  return { nodes, edges };
}

/**
 * Complete Graph
 * Every node connected to every other node
 */
export function generateCompleteGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["nodes"]);

  const { nodes: n } = params;
  const nodes = Array.from({ length: n! }, (_, i) => i);
  const edges: [number, number][] = [];

  for (let i = 0; i < n!; i++) {
    for (let j = 0; j < n!; j++) {
      if (i !== j) {
        edges.push([i, j]);
      }
    }
  }

  return { nodes, edges };
}

/**
 * Cycle Graph
 * Single large cycle
 */
export function generateCycleGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["nodes"]);

  const { nodes: n } = params;
  const nodes = Array.from({ length: n! }, (_, i) => i);
  const edges: [number, number][] = [];

  for (let i = 0; i < n!; i++) {
    const next = (i + 1) % n!;
    edges.push([i, next]);
  }

  return { nodes, edges };
}

/**
 * Grid Graph
 * 2D lattice structure
 */
export function generateGridGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["rows", "cols"]);

  const { rows, cols } = params;
  const n = rows! * cols!;
  const nodes = Array.from({ length: n }, (_, i) => i);
  const edges: [number, number][] = [];

  for (let r = 0; r < rows!; r++) {
    for (let c = 0; c < cols!; c++) {
      const current = r * cols! + c;

      // Right neighbor
      if (c < cols! - 1) {
        const right = r * cols! + (c + 1);
        edges.push([current, right]);
        edges.push([right, current]);
      }

      // Down neighbor
      if (r < rows! - 1) {
        const down = (r + 1) * cols! + c;
        edges.push([current, down]);
        edges.push([down, current]);
      }
    }
  }

  return { nodes, edges };
}

/**
 * Tree Graph
 * Hierarchical structure with no cycles (binary tree)
 */
export function generateTreeGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["depth"]);

  const { depth } = params;
  const n = Math.pow(2, depth!) - 1; // Complete binary tree
  const nodes = Array.from({ length: n }, (_, i) => i);
  const edges: [number, number][] = [];

  for (let i = 0; i < n; i++) {
    const leftChild = 2 * i + 1;
    const rightChild = 2 * i + 2;

    if (leftChild < n) {
      edges.push([i, leftChild]);
      edges.push([leftChild, i]);
    }

    if (rightChild < n) {
      edges.push([i, rightChild]);
      edges.push([rightChild, i]);
    }
  }

  return { nodes, edges };
}

/**
 * Barbell Graph
 * Two dense communities connected by a single path
 * Perfect for community detection
 */
export function generateBarbellGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["communitySize", "pathLength"]);

  const { communitySize, pathLength } = params;
  const n = 2 * communitySize! + pathLength!;
  const nodes = Array.from({ length: n }, (_, i) => i);
  const edges: [number, number][] = [];

  // First community (complete graph)
  for (let i = 0; i < communitySize!; i++) {
    for (let j = 0; j < communitySize!; j++) {
      if (i !== j) {
        edges.push([i, j]);
      }
    }
  }

  // Path connecting communities
  for (let i = 0; i < pathLength! + 1; i++) {
    const from = i === 0 ? communitySize! - 1 : communitySize! + i - 1;
    const to =
      i === pathLength! ? communitySize! + pathLength! : communitySize! + i;
    edges.push([from, to]);
    edges.push([to, from]);
  }

  // Second community (complete graph)
  const offset = communitySize! + pathLength!;
  for (let i = 0; i < communitySize!; i++) {
    for (let j = 0; j < communitySize!; j++) {
      if (i !== j) {
        edges.push([offset + i, offset + j]);
      }
    }
  }

  return { nodes, edges };
}

/**
 * Star Graph
 * Central hub with spokes
 */
export function generateStarGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["nodes"]);

  const { nodes: n } = params;
  const nodes = Array.from({ length: n! }, (_, i) => i);
  const edges: [number, number][] = [];

  for (let i = 1; i < n!; i++) {
    edges.push([0, i]);
    edges.push([i, 0]);
  }

  return { nodes, edges };
}

/**
 * Path Graph
 * Linear chain of nodes
 */
export function generatePathGraph(params: GraphGeneratorParams): Graph {
  validateParams(params, ["nodes"]);

  const { nodes: n } = params;
  const nodes = Array.from({ length: n! }, (_, i) => i);
  const edges: [number, number][] = [];

  for (let i = 0; i < n! - 1; i++) {
    edges.push([i, i + 1]);
  }

  return { nodes, edges };
}

/**
 * Graph generators dictionary
 * Maps generator names to their functions with parameter types
 */
export const GRAPH_GENERATORS = {
  "erdos-renyi": generateErdosRenyiGraph,
  "scale-free": generateScaleFreeGraph,
  "small-world": generateSmallWorldGraph,
  "multi-community": generateMultiCommunityGraph,
  dag: generateDAG,
  bipartite: generateBipartiteGraph,
  complete: generateCompleteGraph,
  cycle: generateCycleGraph,
  grid: generateGridGraph,
  tree: generateTreeGraph,
  barbell: generateBarbellGraph,
  star: generateStarGraph,
  path: generatePathGraph,
} as const;

export type GraphGeneratorType = keyof typeof GRAPH_GENERATORS;

import { assertAlmostEquals, assertEquals } from "@std/assert";
import { computePageRank } from "../src/pagerank.ts";
import type { Graph } from "../src/utils.ts";

Deno.test("PageRank: Simple linear graph (A -> B -> C)", () => {
  // Graph: 0 -> 1 -> 2
  // Node 2 should have highest rank (sink node)
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [
      [0, 1],
      [1, 2],
    ],
  };

  const ranks = computePageRank(graph);

  assertEquals(ranks.length, 3);
  // All ranks should be positive
  ranks.forEach((rank) => assertEquals(rank > 0, true));
  // Sum should be approximately 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);
  // Node 2 (sink) should have highest rank
  assertEquals(ranks[2] > ranks[1], true);
  assertEquals(ranks[2] > ranks[0], true);
});

Deno.test("PageRank: Cycle graph (A -> B -> C -> A)", () => {
  // Graph: 0 -> 1 -> 2 -> 0 (cycle)
  // All nodes should have equal ranks
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  };

  const ranks = computePageRank(graph);

  assertEquals(ranks.length, 3);
  // All nodes should have similar scores in a symmetric cycle
  assertAlmostEquals(ranks[0], ranks[1], 1e-6);
  assertAlmostEquals(ranks[1], ranks[2], 1e-6);
  assertAlmostEquals(ranks[0], 1 / 3, 1e-6);
});

Deno.test("PageRank: Hub and spoke graph", () => {
  // Graph: Hub (0) connected bidirectionally to spokes (1, 2, 3)
  // 1 -> 0, 2 -> 0, 3 -> 0, 0 -> 1, 0 -> 2, 0 -> 3
  const graph: Graph = {
    nodes: [0, 1, 2, 3],
    edges: [
      [1, 0],
      [2, 0],
      [3, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  };

  const ranks = computePageRank(graph);

  assertEquals(ranks.length, 4);
  // Hub (node 0) should have higher rank than spokes (receives from 3 nodes)
  assertEquals(ranks[0] > ranks[1], true);
  assertEquals(ranks[0] > ranks[2], true);
  assertEquals(ranks[0] > ranks[3], true);
  // All spokes should have equal ranks (symmetric positions)
  assertAlmostEquals(ranks[1], ranks[2], 1e-6);
  assertAlmostEquals(ranks[2], ranks[3], 1e-6);
});

Deno.test("PageRank: Single node graph", () => {
  const graph: Graph = {
    nodes: [0],
    edges: [],
  };

  const ranks = computePageRank(graph);

  assertEquals(ranks.length, 1);
  assertAlmostEquals(ranks[0], 1.0, 1e-6);
});

Deno.test("PageRank: Two disconnected nodes", () => {
  const graph: Graph = {
    nodes: [0, 1],
    edges: [],
  };

  const ranks = computePageRank(graph);

  assertEquals(ranks.length, 2);
  // Both nodes should have equal rank
  assertAlmostEquals(ranks[0], 0.5, 1e-6);
  assertAlmostEquals(ranks[1], 0.5, 1e-6);
});

Deno.test("PageRank: Graph with dangling node", () => {
  // Graph: 0 -> 1, 2 (dangling, no outgoing edges)
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [[0, 1]],
  };

  const ranks = computePageRank(graph);

  assertEquals(ranks.length, 3);
  // All ranks should be positive
  ranks.forEach((rank) => assertEquals(rank > 0, true));
  // Sum should be approximately 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);
});

Deno.test("PageRank: Self-loops should be ignored", () => {
  // Graph with self-loops: 0 -> 0, 0 -> 1, 1 -> 1
  const graph: Graph = {
    nodes: [0, 1],
    edges: [
      [0, 0], // self-loop, should be ignored
      [0, 1],
      [1, 1], // self-loop, should be ignored
    ],
  };

  const ranks = computePageRank(graph);

  assertEquals(ranks.length, 2);
  // Node 1 should have higher rank (receives from 0)
  assertEquals(ranks[1] > ranks[0], true);
});

Deno.test("PageRank: Parallel edges should be deduplicated", () => {
  // Graph with parallel edges: 0 -> 1 (twice)
  const graph: Graph = {
    nodes: [0, 1],
    edges: [
      [0, 1],
      [0, 1], // duplicate edge
      [0, 1], // another duplicate
    ],
  };

  const ranks = computePageRank(graph);

  assertEquals(ranks.length, 2);
  // Should behave same as single edge 0 -> 1
  assertEquals(ranks[1] > ranks[0], true);
});

Deno.test("PageRank: Different damping factors on asymmetric graph", () => {
  // Use an asymmetric graph where damping factor matters
  // Graph: 0 -> 1 -> 2, with 2 -> 0 (creates asymmetry)
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 0],
    ],
  };

  const ranks1 = computePageRank(graph, 0.85);
  const ranks2 = computePageRank(graph, 0.5);

  // Different damping factors should produce different results on asymmetric graphs
  assertEquals(ranks1.length, ranks2.length);
  // At least one rank should be different
  const hasDifference = ranks1.some((r, i) => Math.abs(r - ranks2[i]) > 1e-6);
  assertEquals(hasDifference, true);
});

Deno.test("PageRank: Convergence with tight tolerance", () => {
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  };

  const ranks = computePageRank(graph, 0.85, 1000, 1e-10);

  assertEquals(ranks.length, 3);
  // Should still converge and sum to 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);
});

Deno.test("PageRank: Large graph performance", () => {
  // Create a larger graph: 100 nodes in a chain
  const nodes = Array.from({ length: 100 }, (_, i) => i);
  const edges: [number, number][] = [];
  for (let i = 0; i < 99; i++) {
    edges.push([i, i + 1]);
  }
  // Add some back edges to create cycles
  edges.push([99, 0]);
  edges.push([50, 25]);
  edges.push([75, 50]);

  const graph: Graph = { nodes, edges };

  const startTime = performance.now();
  const ranks = computePageRank(graph);
  const endTime = performance.now();

  assertEquals(ranks.length, 100);
  console.log(
    `Large graph (100 nodes) computed in ${(endTime - startTime).toFixed(2)}ms`
  );

  // Verify sum is approximately 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);
});

Deno.test("PageRank: Star graph (one central node)", () => {
  // Graph: 0 <- 1, 0 <- 2, 0 <- 3, 0 <- 4 (all point to center)
  const graph: Graph = {
    nodes: [0, 1, 2, 3, 4],
    edges: [
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ],
  };

  const ranks = computePageRank(graph);

  assertEquals(ranks.length, 5);
  // Central node (0) should have highest rank
  assertEquals(ranks[0] > ranks[1], true);
  assertEquals(ranks[0] > ranks[2], true);
  assertEquals(ranks[0] > ranks[3], true);
  assertEquals(ranks[0] > ranks[4], true);
  // Peripheral nodes should have equal ranks
  assertAlmostEquals(ranks[1], ranks[2], 1e-6);
  assertAlmostEquals(ranks[2], ranks[3], 1e-6);
  assertAlmostEquals(ranks[3], ranks[4], 1e-6);
});

Deno.test("PageRank: Normalization check", () => {
  const graph: Graph = {
    nodes: [0, 1, 2, 3, 4],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [0, 2],
      [2, 4],
    ],
  };

  const ranks = computePageRank(graph);

  // Sum of all PageRank scores should be 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);

  // All scores should be positive
  ranks.forEach((rank) => assertEquals(rank > 0, true));

  // Each score should be less than 1
  ranks.forEach((rank) => assertEquals(rank < 1, true));
});

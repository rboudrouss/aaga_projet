import { assertAlmostEquals, assertEquals, assertThrows } from "@std/assert";
import { computePersonalizedPageRank } from "../src/PPR.ts";
import type { Graph } from "../src/utils.ts";

Deno.test(
  "PPR: Simple linear graph with single seed (A -> B -> C, seed=A)",
  () => {
    // Graph: 0 -> 1 -> 2
    // Seed: node 0
    // Node 0 should have highest PPR score
    const graph: Graph = {
      nodes: [0, 1, 2],
      edges: [
        [0, 1],
        [1, 2],
      ],
    };

    const ranks = computePersonalizedPageRank(graph, [0]);

    assertEquals(ranks.length, 3);
    // All ranks should be positive
    ranks.forEach((rank) => assertEquals(rank > 0, true));
    // Sum should be approximately 1
    const sum = ranks.reduce((a, b) => a + b, 0);
    assertAlmostEquals(sum, 1.0, 1e-6);
    // Node 0 (seed) should have highest rank
    assertEquals(ranks[0] > ranks[1], true);
    assertEquals(ranks[0] > ranks[2], true);
  }
);

Deno.test(
  "PPR: Simple linear graph with sink seed (A -> B -> C, seed=C)",
  () => {
    // Graph: 0 -> 1 -> 2
    // Seed: node 2 (sink)
    // Node 2 should have highest PPR score
    const graph: Graph = {
      nodes: [0, 1, 2],
      edges: [
        [0, 1],
        [1, 2],
      ],
    };

    const ranks = computePersonalizedPageRank(graph, [2]);

    assertEquals(ranks.length, 3);
    // Node 2 (seed and sink) should have highest rank
    assertEquals(ranks[2] > ranks[0], true);
    assertEquals(ranks[2] > ranks[1], true);
    // Sum should be approximately 1
    const sum = ranks.reduce((a, b) => a + b, 0);
    assertAlmostEquals(sum, 1.0, 1e-6);
  }
);

Deno.test(
  "PPR: Cycle graph with single seed (A -> B -> C -> A, seed=A)",
  () => {
    // Graph: 0 -> 1 -> 2 -> 0 (cycle)
    // Seed: node 0
    const graph: Graph = {
      nodes: [0, 1, 2],
      edges: [
        [0, 1],
        [1, 2],
        [2, 0],
      ],
    };

    const ranks = computePersonalizedPageRank(graph, [0]);

    assertEquals(ranks.length, 3);
    // Node 0 (seed) should have highest rank
    assertEquals(ranks[0] > ranks[1], true);
    assertEquals(ranks[0] > ranks[2], true);
    // Sum should be approximately 1
    const sum = ranks.reduce((a, b) => a + b, 0);
    assertAlmostEquals(sum, 1.0, 1e-6);
  }
);

Deno.test("PPR: Multiple seeds with equal weight", () => {
  // Graph: 0 -> 1 -> 2 -> 3
  // Seeds: nodes 0 and 3
  const graph: Graph = {
    nodes: [0, 1, 2, 3],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  };

  const ranks = computePersonalizedPageRank(graph, [0, 3]);

  assertEquals(ranks.length, 4);
  // Both seed nodes should have higher ranks than non-seed nodes
  assertEquals(ranks[0] > ranks[1], true);
  assertEquals(ranks[3] > ranks[1], true);
  assertEquals(ranks[3] > ranks[2], true);
  // Sum should be approximately 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);
});

Deno.test("PPR: Hub and spoke with hub as seed", () => {
  // Graph: Hub (0) connected bidirectionally to spokes (1, 2, 3)
  // Seed: hub (0)
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

  const ranks = computePersonalizedPageRank(graph, [0]);

  assertEquals(ranks.length, 4);
  // Hub (seed) should have highest rank
  assertEquals(ranks[0] > ranks[1], true);
  assertEquals(ranks[0] > ranks[2], true);
  assertEquals(ranks[0] > ranks[3], true);
  // All spokes should have similar ranks (symmetric)
  assertAlmostEquals(ranks[1], ranks[2], 1e-6);
  assertAlmostEquals(ranks[2], ranks[3], 1e-6);
});

Deno.test("PPR: Hub and spoke with spoke as seed", () => {
  // Graph: Hub (0) connected bidirectionally to spokes (1, 2, 3)
  // Seed: spoke (1)
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

  const ranks = computePersonalizedPageRank(graph, [1]);

  assertEquals(ranks.length, 4);
  // Hub receives links from all spokes, so it gets highest rank even with spoke seed
  assertEquals(ranks[0] > ranks[2], true);
  assertEquals(ranks[0] > ranks[3], true);
  // Seed spoke should have higher rank than other spokes
  assertEquals(ranks[1] > ranks[2], true);
  assertEquals(ranks[1] > ranks[3], true);
  // Other spokes should have equal ranks (symmetric from hub)
  assertAlmostEquals(ranks[2], ranks[3], 1e-6);
});

Deno.test("PPR: Single node graph", () => {
  const graph: Graph = {
    nodes: [0],
    edges: [],
  };

  const ranks = computePersonalizedPageRank(graph, [0]);

  assertEquals(ranks.length, 1);
  assertAlmostEquals(ranks[0], 1.0, 1e-6);
});

Deno.test("PPR: Disconnected components with seed in one component", () => {
  // Graph: 0 -> 1, 2 -> 3 (two disconnected components)
  // Seed: node 0
  const graph: Graph = {
    nodes: [0, 1, 2, 3],
    edges: [
      [0, 1],
      [2, 3],
    ],
  };

  const ranks = computePersonalizedPageRank(graph, [0]);

  assertEquals(ranks.length, 4);
  // Nodes in seed component should have higher ranks
  assertEquals(ranks[0] > ranks[2], true);
  assertEquals(ranks[0] > ranks[3], true);
  assertEquals(ranks[1] > ranks[2], true);
  assertEquals(ranks[1] > ranks[3], true);
  // Sum should be approximately 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);
});

Deno.test("PPR: Graph with dangling node and seed", () => {
  // Graph: 0 -> 1, 2 (completely disconnected)
  // Seed: node 0
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [[0, 1]],
  };

  const ranks = computePersonalizedPageRank(graph, [0]);

  assertEquals(ranks.length, 3);
  // Nodes 0 and 1 should have positive ranks (connected component)
  assertEquals(ranks[0] > 0, true);
  assertEquals(ranks[1] > 0, true);
  // Node 2 is unreachable from seed, so it gets 0 rank
  assertAlmostEquals(ranks[2], 0, 1e-6);
  // Sum should be approximately 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);
  // Seed should have highest rank
  assertEquals(ranks[0] > ranks[1], true);
});

Deno.test("PPR: Self-loops should be ignored", () => {
  // Graph with self-loops: 0 -> 0, 0 -> 1, 1 -> 1
  // Seed: node 0
  const graph: Graph = {
    nodes: [0, 1],
    edges: [
      [0, 0], // self-loop, should be ignored
      [0, 1],
      [1, 1], // self-loop, should be ignored
    ],
  };

  const ranks = computePersonalizedPageRank(graph, [0]);

  assertEquals(ranks.length, 2);
  // Node 0 (seed) should have higher rank
  assertEquals(ranks[0] > ranks[1], true);
});

Deno.test("PPR: Parallel edges should be deduplicated", () => {
  // Graph with parallel edges: 0 -> 1 (three times)
  // Seed: node 0
  const graph: Graph = {
    nodes: [0, 1],
    edges: [
      [0, 1],
      [0, 1], // duplicate
      [0, 1], // duplicate
    ],
  };

  const ranks = computePersonalizedPageRank(graph, [0]);

  assertEquals(ranks.length, 2);
  // Should behave same as single edge 0 -> 1
  assertEquals(ranks[0] > ranks[1], true);
});

Deno.test("PPR: Different damping factors", () => {
  // Graph: 0 -> 1 -> 2, with 2 -> 0
  // Seed: node 0
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  };

  const ranks1 = computePersonalizedPageRank(graph, [0], 0.85);
  const ranks2 = computePersonalizedPageRank(graph, [0], 0.5);

  // Different damping factors should produce different results
  assertEquals(ranks1.length, ranks2.length);
  const hasDifference = ranks1.some((r, i) => Math.abs(r - ranks2[i]) > 1e-6);
  assertEquals(hasDifference, true);
});

Deno.test("PPR: Convergence with tight tolerance", () => {
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  };

  const ranks = computePersonalizedPageRank(graph, [0], 0.85, 1000, 1e-10);

  assertEquals(ranks.length, 3);
  // Should still converge and sum to 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);
});

Deno.test("PPR: Normalization check", () => {
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

  const ranks = computePersonalizedPageRank(graph, [0, 2]);

  // Sum of all PPR scores should be 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);

  // All scores should be positive
  ranks.forEach((rank) => assertEquals(rank > 0, true));

  // Each score should be less than 1
  ranks.forEach((rank) => assertEquals(rank < 1, true));
});

Deno.test("PPR: Comparison with standard PageRank (all nodes as seeds)", () => {
  // When all nodes are seeds with equal weight, PPR should approximate PageRank
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  };

  const pprRanks = computePersonalizedPageRank(graph, [0, 1, 2]);

  // In a symmetric cycle, all nodes should have similar ranks
  assertAlmostEquals(pprRanks[0], pprRanks[1], 1e-6);
  assertAlmostEquals(pprRanks[1], pprRanks[2], 1e-6);
});

// Error handling tests
Deno.test("PPR: Error on empty seeds array", () => {
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [[0, 1]],
  };

  assertThrows(
    () => computePersonalizedPageRank(graph, []),
    Error,
    "seeds must contain at least one node"
  );
});

Deno.test("PPR: Error on non-existent seed node", () => {
  const graph: Graph = {
    nodes: [0, 1, 2],
    edges: [[0, 1]],
  };

  assertThrows(
    () => computePersonalizedPageRank(graph, [5]),
    Error,
    "Seed node 5 not found in graph"
  );
});

Deno.test("PPR: Large graph performance", () => {
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
  const ranks = computePersonalizedPageRank(graph, [0, 50]);
  const endTime = performance.now();

  assertEquals(ranks.length, 100);
  console.log(
    `Large graph PPR (100 nodes) computed in ${(endTime - startTime).toFixed(
      2
    )}ms`
  );

  // Verify sum is approximately 1
  const sum = ranks.reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 1e-6);

  // Seed nodes should have higher ranks
  assertEquals(ranks[0] > ranks[10], true);
  assertEquals(ranks[50] > ranks[10], true);
});

Deno.test("PPR: Star graph with center as seed", () => {
  // Graph: 0 <- 1, 0 <- 2, 0 <- 3, 0 <- 4 (all point to center)
  // Seed: center (0)
  const graph: Graph = {
    nodes: [0, 1, 2, 3, 4],
    edges: [
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ],
  };

  const ranks = computePersonalizedPageRank(graph, [0]);

  assertEquals(ranks.length, 5);
  // Central node (seed) should have highest rank
  assertEquals(ranks[0] > ranks[1], true);
  assertEquals(ranks[0] > ranks[2], true);
  assertEquals(ranks[0] > ranks[3], true);
  assertEquals(ranks[0] > ranks[4], true);
  // Peripheral nodes should have equal ranks
  assertAlmostEquals(ranks[1], ranks[2], 1e-6);
  assertAlmostEquals(ranks[2], ranks[3], 1e-6);
  assertAlmostEquals(ranks[3], ranks[4], 1e-6);
});

import { computePageRank } from "./src/pagerank.ts";
import type { Graph } from "./src/utils.ts";

const graph: Graph = {
  nodes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  edges: [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 2],
    [1, 5],
    [2, 3],
    [2, 6],
    [3, 4],
    [3, 7],
    [4, 5],
    [4, 8],
    [5, 6],
    [5, 9],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 0],
    [9, 1],
  ],
};

if (import.meta.main) {
  console.log(computePageRank(graph));
}

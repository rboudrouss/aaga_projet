#!/usr/bin/env -S deno run --allow-read --allow-write
import { Command } from "commander";
import {
  readAll,
  readTextFile,
  writeTextFile,
  exit,
  stdin,
  isMain,
  args,
} from "./src/compat.ts";
import type { Graph } from "./src/utils.ts";
import { extractCommunity, compareRankings } from "./src/utils.ts";
import { computePageRank, type PageRankResult } from "./src/pagerank.ts";
import { computePersonalizedPageRank, type PPRResult } from "./src/PPR.ts";
import { computePushPPR, type PushResult } from "./src/PUSH.ts";
import {
  GRAPH_GENERATORS,
  type GraphGeneratorType,
  type GraphGeneratorParams,
} from "./src/graphGenerators.ts";

/**
 * Parse graph from edge list string format: "0-1,1-2,2-0"
 */
function parseEdgeListString(edgeListStr: string): [number, number][] {
  const edges: [number, number][] = [];
  const edgePairs = edgeListStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s);

  for (const pair of edgePairs) {
    const [from, to] = pair.split("-").map((s) => parseInt(s.trim(), 10));
    if (isNaN(from) || isNaN(to)) {
      throw new Error(
        `Invalid edge format: "${pair}". Expected format: "from-to"`
      );
    }
    edges.push([from, to]);
  }

  return edges;
}

/**
 * Generate nodes array from edges if not provided
 */
function generateNodesFromEdges(edges: [number, number][]): number[] {
  const nodeSet = new Set<number>();
  for (const [from, to] of edges) {
    nodeSet.add(from);
    nodeSet.add(to);
  }
  return Array.from(nodeSet).sort((a, b) => a - b);
}

/**
 * Read graph from various input sources
 */
async function readGraphInput(
  input: string | undefined,
  file: string | undefined
): Promise<Graph> {
  let graphData: Partial<Graph> | null = null;

  if (file) {
    // Read from file
    const content = await readTextFile(file);
    graphData = JSON.parse(content);
  } else if (input) {
    // Parse from edge list string
    const edges = parseEdgeListString(input);
    graphData = { edges };
  } else {
    // Read from stdin
    const bytes = await readAll(stdin);
    const decoder = new TextDecoder();
    const stdinContent = decoder.decode(bytes);

    if (stdinContent.trim()) {
      try {
        // Try parsing as JSON first
        graphData = JSON.parse(stdinContent);
      } catch {
        // Fall back to edge list format
        const edges = parseEdgeListString(stdinContent);
        graphData = { edges };
      }
    }
  }

  if (!graphData || !graphData.edges) {
    throw new Error("No valid graph input provided");
  }

  // Generate nodes if not provided
  if (!graphData.nodes || graphData.nodes.length === 0) {
    graphData.nodes = generateNodesFromEdges(graphData.edges);
  }

  return graphData as Graph;
}

/**
 * Run the specified algorithm on the graph
 */
function runAlgorithm(
  graph: Graph,
  algorithm: string,
  seeds?: number[],
  damping?: number,
  epsilon?: number
): number[] {
  switch (algorithm.toLowerCase()) {
    case "pagerank":
      return computePageRank(graph, damping);
    case "ppr":
      if (!seeds || seeds.length === 0) {
        throw new Error("PPR algorithm requires --seeds parameter");
      }
      return computePersonalizedPageRank(graph, seeds, damping);
    case "push":
      if (!seeds || seeds.length === 0) {
        throw new Error("PUSH algorithm requires --seeds parameter");
      }
      return computePushPPR(graph, seeds, damping, epsilon);
    default:
      throw new Error(
        `Unknown algorithm: ${algorithm}. Use: pagerank, ppr, or push`
      );
  }
}

/**
 * Main CLI entry point
 */
async function main() {
  const program = new Command();

  program
    .name("graph-cli")
    .description(
      "Graph Algorithm CLI - Generate and analyze graphs using PageRank, PPR, and PUSH algorithms\n Type cli <command> --help for command-specific help"
    )
    .version("1.0.0")
    .allowUnknownOption(false);

  // Generate command
  program
    .command("generate")
    .description(
      `Generate a graph using various algorithms

Graph Types:
  erdos-renyi      Random graph G(n,p) - each edge exists with probability p
  scale-free       Barabási-Albert model - preferential attachment creates hubs
  small-world      Watts-Strogatz model - high clustering + short paths
  multi-community  Multiple dense communities with sparse inter-connections
  dag              Directed Acyclic Graph - edges only go from lower to higher indices
  bipartite        Two partitions - edges only between partitions
  barbell          Two dense communities connected by a path
  complete         Fully connected graph - all nodes connected to all others
  cycle            Simple cycle: 0->1->2->...->n-1->0
  grid             2D lattice structure
  tree             Binary tree hierarchy
  star             Hub-and-spoke: central node connected to all others
  path             Linear chain: 0->1->2->...->n-1

Aliases: er, sf, ba, sw, ws, mc, bp`
    )
    .option(
      "-t, --type <algorithm>",
      "Generation algorithm: erdos-renyi (default), scale-free, small-world, multi-community, dag, bipartite, complete, cycle, grid, tree, barbell, star, path",
      "erdos-renyi"
    )
    .option("--nodes <number>", "Number of nodes", "20")
    .option(
      "-p, --probability <number>",
      "Edge probability (for erdos-renyi, dag)",
      "0.1"
    )
    .option("--edges-per-node <number>", "Edges per node (for scale-free)", "2")
    .option(
      "-k, --neighbors <number>",
      "Neighbors in ring (for small-world)",
      "4"
    )
    .option(
      "-b, --beta <number>",
      "Rewiring probability (for small-world)",
      "0.3"
    )
    .option(
      "--communities <number>",
      "Number of communities (for multi-community)",
      "3"
    )
    .option(
      "--nodes-per-community <number>",
      "Nodes per community (for multi-community)",
      "10"
    )
    .option(
      "--intra-prob <number>",
      "Intra-community edge probability (for multi-community)",
      "0.7"
    )
    .option(
      "--inter-prob <number>",
      "Inter-community edge probability (for multi-community)",
      "0.05"
    )
    .option("--n1 <number>", "Size of first partition (for bipartite)", "10")
    .option("--n2 <number>", "Size of second partition (for bipartite)", "10")
    .option("--rows <number>", "Number of rows (for grid)", "5")
    .option("--cols <number>", "Number of columns (for grid)", "5")
    .option("--depth <number>", "Tree depth (for tree)", "4")
    .option("--community-size <number>", "Community size (for barbell)", "5")
    .option("--path-length <number>", "Path length (for barbell)", "3")
    .option("--seed <number>", "Random seed for reproducibility")
    .option("-o, --output <file>", "Output file (default: stdout)")
    .action(async (options) => {
      try {
        // Normalize type name and check aliases
        const typeAliases: Record<string, GraphGeneratorType> = {
          er: "erdos-renyi",
          sf: "scale-free",
          "barabasi-albert": "scale-free",
          ba: "scale-free",
          sw: "small-world",
          "watts-strogatz": "small-world",
          ws: "small-world",
          mc: "multi-community",
          bp: "bipartite",
        };

        const normalizedType = (typeAliases[options.type.toLowerCase()] ||
          options.type.toLowerCase()) as GraphGeneratorType;

        // Validate type
        if (!(normalizedType in GRAPH_GENERATORS)) {
          const validTypes = Object.keys(GRAPH_GENERATORS).join(", ");
          throw new Error(
            `Unknown graph type: ${options.type}. Valid types: ${validTypes}`
          );
        }

        // Build parameters dictionary
        const params: GraphGeneratorParams = {
          nodes: parseInt(options.nodes),
          probability: parseFloat(options.probability),
          edgesPerNode: parseInt(options.edgesPerNode),
          neighbors: parseInt(options.neighbors),
          beta: parseFloat(options.beta),
          communities: parseInt(options.communities),
          nodesPerCommunity: parseInt(options.nodesPerCommunity),
          intraProb: parseFloat(options.intraProb),
          interProb: parseFloat(options.interProb),
          n1: parseInt(options.n1),
          n2: parseInt(options.n2),
          rows: parseInt(options.rows),
          cols: parseInt(options.cols),
          depth: parseInt(options.depth),
          communitySize: parseInt(options.communitySize),
          pathLength: parseInt(options.pathLength),
          seed: options.seed ? parseInt(options.seed) : undefined,
        };

        // Generate graph using the appropriate generator
        const graph = GRAPH_GENERATORS[normalizedType](params);

        const output = JSON.stringify(graph, null);

        if (options.output) {
          await writeTextFile(options.output, output);
          console.error(`Graph written to ${options.output}`);
          console.error(
            `Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`
          );
        } else {
          console.log(output);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        exit(1);
      }
    });

  // Run command
  program
    .command("run")
    .description("Run an algorithm on a graph")
    .requiredOption(
      "-a, --algorithm <type>",
      "Algorithm to run: pagerank, ppr, push"
    )
    .option("-f, --file <path>", "Read graph from JSON file")
    .option(
      "-i, --input <edges>",
      'Graph as edge list string (e.g., "0-1,1-2,2-0")'
    )
    .option(
      "-s, --seeds <nodes>",
      'Comma-separated seed nodes for PPR/PUSH (e.g., "0,1,2")'
    )
    .option("-d, --damping <number>", "Damping factor", parseFloat, 0.85)
    .option(
      "-e, --epsilon <number>",
      "Epsilon for PUSH algorithm",
      parseFloat,
      1e-4
    )
    .option("-p, --performance", "Show execution time", false)
    .action(async (options) => {
      try {
        const graph = await readGraphInput(options.input, options.file);

        const seeds: number[] | undefined = options.seeds
          ? options.seeds.split(",").map((s: string) => parseInt(s.trim(), 10))
          : undefined;

        const startTime = options.performance ? performance.now() : 0;
        const result = runAlgorithm(
          graph,
          options.algorithm,
          seeds,
          options.damping,
          options.epsilon
        );
        const endTime = options.performance ? performance.now() : 0;

        // Output results
        console.log(JSON.stringify(result, null, 2));

        if (options.performance) {
          const executionTime = endTime - startTime;
          console.error(`\nExecution time: ${executionTime.toFixed(3)} ms`);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        exit(1);
      }
    });

  // Convergence study command
  program
    .command("convergence")
    .description("Study convergence of PR/PPR with different tolerance values")
    .requiredOption("-a, --algorithm <type>", "Algorithm: pagerank or ppr")
    .option("-f, --file <path>", "Read graph from JSON file")
    .option("-i, --input <edges>", "Graph as edge list string")
    .option("-s, --seeds <nodes>", "Comma-separated seed nodes for PPR")
    .option("-d, --damping <number>", "Damping factor", parseFloat, 0.85)
    .option(
      "-t, --tolerances <values>",
      "Comma-separated tolerance values (e.g., '1e-3,1e-4,1e-5,1e-6')",
      "1e-3,1e-4,1e-5,1e-6,1e-7,1e-8"
    )
    .option("-o, --output <file>", "Output file for results (default: stdout)")
    .action(async (options) => {
      try {
        const graph = await readGraphInput(options.input, options.file);
        const tolerances: number[] = options.tolerances
          .split(",")
          .map((t: string) => parseFloat(t.trim()));

        const results: {
          tolerance: number;
          iterations: number;
          converged: boolean;
          finalDiff: number;
          executionTimeMs: number;
        }[] = [];

        for (const tolerance of tolerances) {
          if (options.algorithm.toLowerCase() === "pagerank") {
            const result = computePageRank(
              graph,
              options.damping,
              1000,
              tolerance,
              true
            ) as PageRankResult;
            results.push({
              tolerance,
              iterations: result.iterations,
              converged: result.converged,
              finalDiff: result.finalDiff,
              executionTimeMs: result.executionTimeMs,
            });
          } else if (options.algorithm.toLowerCase() === "ppr") {
            if (!options.seeds) {
              throw new Error("PPR requires --seeds parameter");
            }
            const seeds: number[] = options.seeds
              .split(",")
              .map((s: string) => parseInt(s.trim(), 10));
            const result = computePersonalizedPageRank(
              graph,
              seeds,
              options.damping,
              1000,
              tolerance,
              true
            ) as PPRResult;
            results.push({
              tolerance,
              iterations: result.iterations,
              converged: result.converged,
              finalDiff: result.finalDiff,
              executionTimeMs: result.executionTimeMs,
            });
          } else {
            throw new Error("Algorithm must be 'pagerank' or 'ppr'");
          }
        }

        const output = JSON.stringify(results, null, 2);
        if (options.output) {
          await writeTextFile(options.output, output);
          console.error(`Results written to ${options.output}`);
        } else {
          console.log(output);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        exit(1);
      }
    });

  // Community detection command
  program
    .command("community")
    .description("Detect local communities around seed nodes using PPR")
    .option("-f, --file <path>", "Read graph from JSON file")
    .option("-i, --input <edges>", "Graph as edge list string")
    .requiredOption("-s, --seeds <nodes>", "Comma-separated seed nodes")
    .option("-d, --damping <number>", "Damping factor", parseFloat, 0.85)
    .option("-e, --epsilon <number>", "Tolerance for PPR", parseFloat, 1e-6)
    .option(
      "-t, --threshold <number>",
      "Minimum score threshold for community membership",
      parseFloat,
      0.01
    )
    .option("-o, --output <file>", "Output file for results (default: stdout)")
    .action(async (options) => {
      try {
        const graph = await readGraphInput(options.input, options.file);
        const seeds: number[] = options.seeds
          .split(",")
          .map((s: string) => parseInt(s.trim(), 10));

        const result = computePersonalizedPageRank(
          graph,
          seeds,
          options.damping,
          1000,
          options.epsilon,
          true
        ) as PPRResult;

        const community = extractCommunity(result.ranks, options.threshold);

        const output = JSON.stringify(
          {
            seeds,
            damping: options.damping,
            tolerance: options.epsilon,
            threshold: options.threshold,
            iterations: result.iterations,
            converged: result.converged,
            executionTimeMs: result.executionTimeMs,
            communitySize: community.length,
            community,
          },
          null,
          2
        );

        if (options.output) {
          await writeTextFile(options.output, output);
          console.error(`Results written to ${options.output}`);
        } else {
          console.log(output);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        exit(1);
      }
    });

  // Compare PUSH vs PPR command
  program
    .command("compare")
    .description("Compare PUSH and PPR algorithms")
    .option("-f, --file <path>", "Read graph from JSON file")
    .option("-i, --input <edges>", "Graph as edge list string")
    .requiredOption("-s, --seeds <nodes>", "Comma-separated seed nodes")
    .option("-d, --damping <number>", "Damping factor", parseFloat, 0.85)
    .option(
      "-e, --epsilons <values>",
      "Comma-separated epsilon values for PUSH (e.g., '1e-3,1e-4,1e-5')",
      "1e-3,1e-4,1e-5,1e-6"
    )
    .option("-t, --tolerance <number>", "Tolerance for PPR", parseFloat, 1e-6)
    .option(
      "--community-threshold <number>",
      "Threshold for community extraction",
      parseFloat,
      0.01
    )
    .option("-o, --output <file>", "Output file for results (default: stdout)")
    .action(async (options) => {
      try {
        const graph = await readGraphInput(options.input, options.file);
        const seeds: number[] = options.seeds
          .split(",")
          .map((s: string) => parseInt(s.trim(), 10));

        // Run PPR
        const pprResult = computePersonalizedPageRank(
          graph,
          seeds,
          options.damping,
          1000,
          options.tolerance,
          true
        ) as PPRResult;

        const pprCommunity = extractCommunity(
          pprResult.ranks,
          options.communityThreshold
        );

        // Run PUSH with different epsilon values
        const epsilons: number[] = options.epsilons
          .split(",")
          .map((e: string) => parseFloat(e.trim()));

        const pushResults = epsilons.map((epsilon) => {
          const pushResult = computePushPPR(
            graph,
            seeds,
            options.damping,
            epsilon,
            true
          ) as PushResult;

          const pushCommunity = extractCommunity(
            pushResult.ranks,
            options.communityThreshold
          );

          const comparison = compareRankings(pprResult.ranks, pushResult.ranks);

          return {
            epsilon,
            pushOperations: pushResult.pushOperations,
            nodesProcessed: pushResult.nodesProcessed,
            executionTimeMs: pushResult.executionTimeMs,
            preprocessingTimeMs: pushResult.preprocessingTimeMs,
            algorithmTimeMs: pushResult.algorithmTimeMs,
            communitySize: pushCommunity.length,
            comparison,
          };
        });

        const output = JSON.stringify(
          {
            seeds,
            damping: options.damping,
            ppr: {
              tolerance: options.tolerance,
              iterations: pprResult.iterations,
              converged: pprResult.converged,
              executionTimeMs: pprResult.executionTimeMs,
              preprocessingTimeMs: pprResult.preprocessingTimeMs,
              algorithmTimeMs: pprResult.algorithmTimeMs,
              communitySize: pprCommunity.length,
            },
            push: pushResults,
            speedup: pushResults.map((pr) => ({
              epsilon: pr.epsilon,
              speedupFactorTotal:
                pprResult.executionTimeMs / pr.executionTimeMs,
              speedupFactorAlgorithmOnly:
                pprResult.algorithmTimeMs / pr.algorithmTimeMs,
            })),
          },
          null,
          2
        );

        if (options.output) {
          await writeTextFile(options.output, output);
          console.error(`Results written to ${options.output}`);
        } else {
          console.log(output);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        exit(1);
      }
    });

  await program.parseAsync(["deno", "cli.ts", ...args]);
}

if (isMain(import.meta)) {
  main();
}

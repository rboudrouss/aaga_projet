#!/usr/bin/env python3
"""
Ce fichier a été écrit en très grande partie avec Copilot et l'IA ChatGPT

Script de visualisation des résultats d'analyse des algorithmes PageRank, PPR et PUSH.

Usage:
    python visualize.py results/

Ce script génère des graphiques pour :
1. Convergence : nombre d'itérations vs précision
2. Convergence : temps d'exécution vs précision
3. Communautés : taille de communauté vs seuil
4. PUSH vs PPR : speedup vs epsilon
5. PUSH vs PPR : précision (L1 distance) vs epsilon
"""

import json
import sys
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict

# Structure des répertoires
PATHS = {
    'pagerank_convergence': 'pagerank/convergence',
    'pagerank_damping': 'pagerank/damping',
    'ppr_convergence': 'ppr/convergence',
    'ppr_community_threshold': 'ppr/community/threshold',
    'ppr_community_seed': 'ppr/community/seed',
    'push': 'push',
    'push_tolerance': 'push/tolerance',
    'scalability': 'scalability',
    'plots': 'plots'
}

def get_path(results_dir, key):
    """Retourne le chemin complet pour une clé donnée."""
    return Path(results_dir) / PATHS.get(key, '')

def load_json(filepath):
    """Charge un fichier JSON."""
    with open(filepath, 'r') as f:
        return json.load(f)

def load_multiple_runs(results_dir, pattern):
    """
    Charge plusieurs fichiers JSON correspondant à un pattern et calcule les moyennes.

    Args:
        results_dir: Répertoire contenant les résultats
        pattern: Pattern du nom de fichier (ex: "pr_convergence_run*.json")

    Returns:
        Liste de dictionnaires avec les données moyennées
    """
    results_dir = Path(results_dir)
    files = sorted(results_dir.glob(pattern))

    if not files:
        return None

    # Charger tous les fichiers
    all_data = [load_json(f) for f in files]

    if not all_data:
        return None

    # Si c'est une liste de résultats (convergence)
    if isinstance(all_data[0], list):
        # Grouper par tolérance
        grouped = defaultdict(lambda: {'iterations': [], 'times': []})

        for data in all_data:
            for result in data:
                tol = result['tolerance']
                grouped[tol]['iterations'].append(result['iterations'])
                grouped[tol]['times'].append(result['executionTimeMs'])

        # Calculer les moyennes et écart-types
        averaged = []
        for tol in sorted(grouped.keys()):
            averaged.append({
                'tolerance': tol,
                'iterations': np.mean(grouped[tol]['iterations']),
                'iterations_std': np.std(grouped[tol]['iterations']),
                'executionTimeMs': np.mean(grouped[tol]['times']),
                'executionTimeMs_std': np.std(grouped[tol]['times'])
            })

        return averaged

    return None

def load_multiple_compare_runs(results_dir, pattern):
    """
    Charge plusieurs fichiers de comparaison PUSH vs PPR et calcule les moyennes.

    Args:
        results_dir: Répertoire contenant les résultats
        pattern: Pattern du nom de fichier (ex: "push_vs_ppr_seed0_run*.json")

    Returns:
        Dictionnaire avec les données moyennées
    """
    results_dir = Path(results_dir)
    files = sorted(results_dir.glob(pattern))

    if not files:
        return None

    # Charger tous les fichiers
    all_data = [load_json(f) for f in files]

    if not all_data:
        return None

    # Grouper les résultats PUSH par epsilon
    push_grouped = defaultdict(lambda: {
        'pushOperations': [], 'nodesProcessed': [], 'executionTimeMs': [],
        'preprocessingTimeMs': [], 'algorithmTimeMs': [], 'communitySize': [],
        'l1Distance': [], 'l2Distance': [], 'correlation': []
    })

    # Grouper les résultats PPR
    ppr_grouped = {
        'iterations': [], 'executionTimeMs': [], 'preprocessingTimeMs': [],
        'algorithmTimeMs': [], 'communitySize': []
    }

    # Grouper les speedups
    speedup_grouped = defaultdict(lambda: {
        'speedupFactorTotal': [], 'speedupFactorAlgorithmOnly': []
    })

    for data in all_data:
        # PPR data
        ppr_grouped['iterations'].append(data['ppr']['iterations'])
        ppr_grouped['executionTimeMs'].append(data['ppr']['executionTimeMs'])
        ppr_grouped['preprocessingTimeMs'].append(data['ppr'].get('preprocessingTimeMs', 0))
        ppr_grouped['algorithmTimeMs'].append(data['ppr'].get('algorithmTimeMs', data['ppr']['executionTimeMs']))
        ppr_grouped['communitySize'].append(data['ppr']['communitySize'])

        # PUSH data
        for push_result in data['push']:
            eps = push_result['epsilon']
            push_grouped[eps]['pushOperations'].append(push_result['pushOperations'])
            push_grouped[eps]['nodesProcessed'].append(push_result['nodesProcessed'])
            push_grouped[eps]['executionTimeMs'].append(push_result['executionTimeMs'])
            push_grouped[eps]['preprocessingTimeMs'].append(push_result.get('preprocessingTimeMs', 0))
            push_grouped[eps]['algorithmTimeMs'].append(push_result.get('algorithmTimeMs', push_result['executionTimeMs']))
            push_grouped[eps]['communitySize'].append(push_result['communitySize'])
            push_grouped[eps]['l1Distance'].append(push_result['comparison']['l1Distance'])
            push_grouped[eps]['l2Distance'].append(push_result['comparison']['l2Distance'])
            push_grouped[eps]['correlation'].append(push_result['comparison']['correlation'])

        # Speedup data
        for speedup_result in data['speedup']:
            eps = speedup_result['epsilon']
            speedup_grouped[eps]['speedupFactorTotal'].append(
                speedup_result.get('speedupFactorTotal', speedup_result.get('speedupFactor', 1))
            )
            speedup_grouped[eps]['speedupFactorAlgorithmOnly'].append(
                speedup_result.get('speedupFactorAlgorithmOnly', speedup_result.get('speedupFactorTotal', 1))
            )

    # Calculer les moyennes
    ppr_averaged = {
        'iterations': np.mean(ppr_grouped['iterations']),
        'executionTimeMs': np.mean(ppr_grouped['executionTimeMs']),
        'preprocessingTimeMs': np.mean(ppr_grouped['preprocessingTimeMs']),
        'algorithmTimeMs': np.mean(ppr_grouped['algorithmTimeMs']),
        'communitySize': np.mean(ppr_grouped['communitySize'])
    }

    push_averaged = []
    speedup_averaged = []

    for eps in sorted(push_grouped.keys()):
        push_averaged.append({
            'epsilon': eps,
            'pushOperations': np.mean(push_grouped[eps]['pushOperations']),
            'pushOperations_std': np.std(push_grouped[eps]['pushOperations']),
            'nodesProcessed': np.mean(push_grouped[eps]['nodesProcessed']),
            'executionTimeMs': np.mean(push_grouped[eps]['executionTimeMs']),
            'executionTimeMs_std': np.std(push_grouped[eps]['executionTimeMs']),
            'preprocessingTimeMs': np.mean(push_grouped[eps]['preprocessingTimeMs']),
            'algorithmTimeMs': np.mean(push_grouped[eps]['algorithmTimeMs']),
            'communitySize': np.mean(push_grouped[eps]['communitySize']),
            'comparison': {
                'l1Distance': np.mean(push_grouped[eps]['l1Distance']),
                'l1Distance_std': np.std(push_grouped[eps]['l1Distance']),
                'l2Distance': np.mean(push_grouped[eps]['l2Distance']),
                'l2Distance_std': np.std(push_grouped[eps]['l2Distance']),
                'correlation': np.mean(push_grouped[eps]['correlation']),
                'correlation_std': np.std(push_grouped[eps]['correlation'])
            }
        })

        speedup_averaged.append({
            'epsilon': eps,
            'speedupFactorTotal': np.mean(speedup_grouped[eps]['speedupFactorTotal']),
            'speedupFactorTotal_std': np.std(speedup_grouped[eps]['speedupFactorTotal']),
            'speedupFactorAlgorithmOnly': np.mean(speedup_grouped[eps]['speedupFactorAlgorithmOnly']),
            'speedupFactorAlgorithmOnly_std': np.std(speedup_grouped[eps]['speedupFactorAlgorithmOnly'])
        })

    return {
        'ppr': ppr_averaged,
        'push': push_averaged,
        'speedup': speedup_averaged
    }

def plot_convergence(results_dir):
    """Graphiques de convergence pour PR et PPR."""
    results_dir = Path(results_dir)
    pr_dir = get_path(results_dir, 'pagerank_convergence')
    ppr_dir = get_path(results_dir, 'ppr_convergence')
    plots_dir = get_path(results_dir, 'plots')

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    has_data = False

    # Try multiple runs first, then fall back to single files
    # PageRank convergence
    pr_data = load_multiple_runs(pr_dir, "pr_convergence_run*.json")
    if pr_data:
        tolerances = [d['tolerance'] for d in pr_data]
        iterations = [d['iterations'] for d in pr_data]
        iterations_std = [d['iterations_std'] for d in pr_data]
        times = [d['executionTimeMs'] for d in pr_data]
        times_std = [d['executionTimeMs_std'] for d in pr_data]

        ax1.loglog(tolerances, iterations, 'o-', label='PageRank (moyenne)', linewidth=2, markersize=8)
        ax1.fill_between(tolerances,
                         np.array(iterations) - np.array(iterations_std),
                         np.array(iterations) + np.array(iterations_std),
                         alpha=0.2)
        ax2.loglog(tolerances, times, 'o-', label='PageRank (moyenne)', linewidth=2, markersize=8)
        ax2.fill_between(tolerances,
                         np.array(times) - np.array(times_std),
                         np.array(times) + np.array(times_std),
                         alpha=0.2)
        has_data = True
    else:
        # Fallback to single file
        pr_files = [
            results_dir / "pr_convergence.json",
            results_dir / "test_pr_conv.json"
        ]
        for pr_file in pr_files:
            if pr_file.exists():
                data = load_json(pr_file)
                if data:
                    tolerances = [d['tolerance'] for d in data]
                    iterations = [d['iterations'] for d in data]
                    times = [d['executionTimeMs'] for d in data]

                    ax1.loglog(tolerances, iterations, 'o-', label='PageRank', linewidth=2, markersize=8)
                    ax2.loglog(tolerances, times, 'o-', label='PageRank', linewidth=2, markersize=8)
                    has_data = True
                    break

    # PPR convergence (single seed)
    ppr_data = load_multiple_runs(ppr_dir, "ppr_convergence_seed0_run*.json")
    if ppr_data:
        tolerances = [d['tolerance'] for d in ppr_data]
        iterations = [d['iterations'] for d in ppr_data]
        iterations_std = [d['iterations_std'] for d in ppr_data]
        times = [d['executionTimeMs'] for d in ppr_data]
        times_std = [d['executionTimeMs_std'] for d in ppr_data]

        ax1.loglog(tolerances, iterations, 's-', label='PPR (seed=0, moyenne)', linewidth=2, markersize=8)
        ax1.fill_between(tolerances,
                         np.array(iterations) - np.array(iterations_std),
                         np.array(iterations) + np.array(iterations_std),
                         alpha=0.2)
        ax2.loglog(tolerances, times, 's-', label='PPR (seed=0, moyenne)', linewidth=2, markersize=8)
        ax2.fill_between(tolerances,
                         np.array(times) - np.array(times_std),
                         np.array(times) + np.array(times_std),
                         alpha=0.2)
        has_data = True
    else:
        # Fallback to single file
        ppr_files = [
            results_dir / "ppr_convergence_seed0.json",
            results_dir / "test_ppr_conv.json"
        ]
        for ppr_file in ppr_files:
            if ppr_file.exists():
                data = load_json(ppr_file)
                if data:
                    tolerances = [d['tolerance'] for d in data]
                    iterations = [d['iterations'] for d in data]
                    times = [d['executionTimeMs'] for d in data]

                    ax1.loglog(tolerances, iterations, 's-', label='PPR (seed=0)', linewidth=2, markersize=8)
                    ax2.loglog(tolerances, times, 's-', label='PPR (seed=0)', linewidth=2, markersize=8)
                    has_data = True
                    break

    # PPR convergence (multiple seeds)
    ppr_multi_data = load_multiple_runs(ppr_dir, "ppr_convergence_multi_run*.json")
    if ppr_multi_data:
        tolerances = [d['tolerance'] for d in ppr_multi_data]
        iterations = [d['iterations'] for d in ppr_multi_data]
        iterations_std = [d['iterations_std'] for d in ppr_multi_data]
        times = [d['executionTimeMs'] for d in ppr_multi_data]
        times_std = [d['executionTimeMs_std'] for d in ppr_multi_data]

        ax1.loglog(tolerances, iterations, '^-', label='PPR (seeds=0,10,20, moyenne)', linewidth=2, markersize=8)
        ax1.fill_between(tolerances,
                         np.array(iterations) - np.array(iterations_std),
                         np.array(iterations) + np.array(iterations_std),
                         alpha=0.2)
        ax2.loglog(tolerances, times, '^-', label='PPR (seeds=0,10,20, moyenne)', linewidth=2, markersize=8)
        ax2.fill_between(tolerances,
                         np.array(times) - np.array(times_std),
                         np.array(times) + np.array(times_std),
                         alpha=0.2)
        has_data = True
    else:
        # Fallback to single file
        ppr_multi_files = [
            results_dir / "ppr_convergence_multi.json"
        ]
        for ppr_multi_file in ppr_multi_files:
            if ppr_multi_file.exists():
                data = load_json(ppr_multi_file)
                if data:
                    tolerances = [d['tolerance'] for d in data]
                    iterations = [d['iterations'] for d in data]
                    times = [d['executionTimeMs'] for d in data]

                    ax1.loglog(tolerances, iterations, '^-', label='PPR (seeds=0,10,20)', linewidth=2, markersize=8)
                    ax2.loglog(tolerances, times, '^-', label='PPR (seeds=0,10,20)', linewidth=2, markersize=8)
                    has_data = True
                    break

    if not has_data:
        print("Aucune donnée de convergence trouvée, graphique ignoré")
        plt.close()
        return

    ax1.set_xlabel('Tolérance', fontsize=12)
    ax1.set_ylabel('Nombre d\'itérations', fontsize=12)
    ax1.set_title('Convergence : Itérations vs Précision', fontsize=14, fontweight='bold')
    ax1.grid(True, alpha=0.3)
    ax1.legend(fontsize=10)
    ax1.invert_xaxis()

    ax2.set_xlabel('Tolérance', fontsize=12)
    ax2.set_ylabel('Temps d\'exécution (ms)', fontsize=12)
    ax2.set_title('Convergence : Temps vs Précision', fontsize=14, fontweight='bold')
    ax2.grid(True, alpha=0.3)
    ax2.legend(fontsize=10)
    ax2.invert_xaxis()

    plt.tight_layout()
    output_file = plots_dir / 'convergence_analysis.png'
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"✓ Graphique sauvegardé : {output_file}")
    plt.close()

def plot_communities(results_dir):
    """Graphiques d'analyse des communautés."""
    results_dir = Path(results_dir)
    threshold_dir = get_path(results_dir, 'ppr_community_threshold')
    seed_dir = get_path(results_dir, 'ppr_community_seed')
    plots_dir = get_path(results_dir, 'plots')

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    has_data_left = False
    has_data_right = False

    # Community size vs threshold
    thresholds = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1]
    community_sizes = []
    community_sizes_std = []

    for threshold in thresholds:
        # Try multiple runs first
        run_files = sorted(threshold_dir.glob(f"community_threshold_{threshold}_run*.json"))
        if run_files:
            sizes = []
            for f in run_files:
                data = load_json(f)
                sizes.append(data['communitySize'])
            community_sizes.append(np.mean(sizes))
            community_sizes_std.append(np.std(sizes))
        else:
            # Fallback to single file
            file = threshold_dir / f"community_threshold_{threshold}.json"
            if file.exists():
                data = load_json(file)
                community_sizes.append(data['communitySize'])
                community_sizes_std.append(0)
            else:
                community_sizes.append(None)
                community_sizes_std.append(None)

    # Filter out None values
    valid_data = [(t, s, std) for t, s, std in zip(thresholds, community_sizes, community_sizes_std) if s is not None]
    if valid_data:
        thresholds_valid, sizes_valid, stds_valid = zip(*valid_data)
        ax1.errorbar(thresholds_valid, sizes_valid, yerr=stds_valid, fmt='o-',
                     linewidth=2, markersize=10, color='#2E86AB', capsize=5)
        ax1.set_xlabel('Seuil de score PPR', fontsize=12)
        ax1.set_ylabel('Taille de la communauté', fontsize=12)
        ax1.set_title('Taille de communauté vs Seuil', fontsize=14, fontweight='bold')
        ax1.set_xscale('log')
        ax1.grid(True, alpha=0.3)
        ax1.invert_xaxis()
        has_data_left = True

    # Community distribution for different seeds
    seeds = [0, 10, 20, 30]
    colors = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D']

    # Also try test_community.json
    test_community_file = results_dir / "test_community.json"
    if test_community_file.exists():
        data = load_json(test_community_file)
        community = data['community'][:10]  # Top 10 nodes
        nodes = [c['node'] for c in community]
        scores = [c['score'] for c in community]

        ax2.barh(range(len(nodes)), scores, label=f'Seed {data["seeds"][0]}', alpha=0.7, color=colors[0])
        has_data_right = True
    else:
        for seed, color in zip(seeds, colors):
            # Try multiple runs first
            run_files = sorted(seed_dir.glob(f"community_seed_{seed}_run*.json"))
            if run_files:
                # Average the scores across runs
                all_communities = []
                for f in run_files:
                    data = load_json(f)
                    all_communities.append(data['community'][:10])

                # Average scores for each node position
                avg_scores = []
                for i in range(10):
                    scores_at_pos = [comm[i]['score'] for comm in all_communities if i < len(comm)]
                    if scores_at_pos:
                        avg_scores.append(np.mean(scores_at_pos))
                    else:
                        avg_scores.append(0)

                ax2.barh(range(len(avg_scores)), avg_scores, label=f'Seed {seed} (moyenne)',
                        alpha=0.7, color=color)
                has_data_right = True
            else:
                # Fallback to single file
                file = seed_dir / f"community_seed_{seed}.json"
                if file.exists():
                    data = load_json(file)
                    community = data['community'][:10]  # Top 10 nodes
                    nodes = [c['node'] for c in community]
                    scores = [c['score'] for c in community]

                    ax2.barh(range(len(nodes)), scores, label=f'Seed {seed}', alpha=0.7, color=color)
                    has_data_right = True

    if has_data_right:
        ax2.set_xlabel('Score PPR', fontsize=12)
        ax2.set_ylabel('Rang du nœud', fontsize=12)
        ax2.set_title('Distribution des scores PPR (Top 10)', fontsize=14, fontweight='bold')
        ax2.legend(fontsize=10)
        ax2.grid(True, alpha=0.3, axis='x')

    if not has_data_left and not has_data_right:
        print("Aucune donnée de communauté trouvée, graphique ignoré")
        plt.close()
        return

    plt.tight_layout()
    output_file = plots_dir / 'community_analysis.png'
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"✓ Graphique sauvegardé : {output_file}")
    plt.close()

def plot_push_vs_ppr(results_dir):
    """Graphiques de comparaison PUSH vs PPR."""
    results_dir = Path(results_dir)
    push_dir = get_path(results_dir, 'push')
    plots_dir = get_path(results_dir, 'plots')

    fig = plt.figure(figsize=(14, 10))
    gs = fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)

    # Try multiple runs first
    data = load_multiple_compare_runs(push_dir, "compare_seed0_run*.json")

    if not data:
        # Fallback to single file
        compare_files = [
            push_dir / "compare_seed0.json",
            results_dir / "push_vs_ppr_seed0.json",  # Old location
            results_dir / "test_compare.json"
        ]

        for compare_file in compare_files:
            if compare_file.exists():
                data = load_json(compare_file)
                break

    if not data:
        print("Aucune donnée de comparaison PUSH vs PPR trouvée, graphique ignoré")
        plt.close()
        return

    push_results = data['push']
    speedup_data = data['speedup']

    epsilons = [p['epsilon'] for p in push_results]
    # Handle both old and new JSON format
    speedups = [s.get('speedupFactorTotal', s.get('speedupFactor', 1)) for s in speedup_data]
    speedups_std = [s.get('speedupFactorTotal_std', 0) for s in speedup_data]
    l1_distances = [p['comparison']['l1Distance'] for p in push_results]
    l1_distances_std = [p['comparison'].get('l1Distance_std', 0) for p in push_results]

    # Get timing breakdown if available
    ppr_time = data['ppr']['executionTimeMs']
    ppr_preprocessing = data['ppr'].get('preprocessingTimeMs', 0)
    ppr_algorithm = data['ppr'].get('algorithmTimeMs', ppr_time)
    push_preprocessing = [p.get('preprocessingTimeMs', 0) for p in push_results]
    push_algorithm = [p.get('algorithmTimeMs', p['executionTimeMs']) for p in push_results]

    # Also get algorithm-only speedup if available
    speedups_algo = [s.get('speedupFactorAlgorithmOnly', s.get('speedupFactorTotal', 1)) for s in speedup_data]
    speedups_algo_std = [s.get('speedupFactorAlgorithmOnly_std', 0) for s in speedup_data]

    # Speedup vs epsilon (total)
    ax1 = fig.add_subplot(gs[0, 0])
    ax1.errorbar(epsilons, speedups, yerr=speedups_std, fmt='o-', linewidth=2,
                 markersize=10, color='#2E86AB', label='Total', capsize=5)
    if any(s != speedups[i] for i, s in enumerate(speedups_algo)):
        ax1.errorbar(epsilons, speedups_algo, yerr=speedups_algo_std, fmt='s-',
                     linewidth=2, markersize=8, color='#F18F01', label='Algorithm only', capsize=5)
    ax1.axhline(y=1, color='red', linestyle='--', alpha=0.5, label='Pas de speedup')
    ax1.set_xlabel('Epsilon (PUSH)', fontsize=12)
    ax1.set_ylabel('Facteur d\'accélération', fontsize=12)
    ax1.set_title('Speedup PUSH vs PPR', fontsize=14, fontweight='bold')
    ax1.set_xscale('log')
    ax1.grid(True, alpha=0.3)
    ax1.legend(fontsize=10)
    ax1.invert_xaxis()

    # Precision (L1 distance) vs epsilon
    ax2 = fig.add_subplot(gs[0, 1])
    ax2.errorbar(epsilons, l1_distances, yerr=l1_distances_std, fmt='s-',
                 linewidth=2, markersize=10, color='#A23B72', capsize=5)
    ax2.set_xlabel('Epsilon (PUSH)', fontsize=12)
    ax2.set_ylabel('Distance L1 avec PPR', fontsize=12)
    ax2.set_title('Précision de PUSH vs Epsilon', fontsize=14, fontweight='bold')
    ax2.set_xscale('log')
    ax2.set_yscale('log')
    ax2.grid(True, alpha=0.3)
    ax2.invert_xaxis()

    # Timing breakdown
    ax3 = fig.add_subplot(gs[1, :])
    x = np.arange(len(epsilons))
    width = 0.35

    # PUSH bars
    ax3.bar(x - width/2, push_preprocessing, width, label='PUSH Preprocessing',
            color='#A8DADC', alpha=0.8)
    ax3.bar(x - width/2, push_algorithm, width, bottom=push_preprocessing,
            label='PUSH Algorithm', color='#2E86AB', alpha=0.8)

    # PPR bars
    ax3.bar(x + width/2, [ppr_preprocessing] * len(epsilons), width,
            label='PPR Preprocessing', color='#F4A261', alpha=0.8)
    ax3.bar(x + width/2, [ppr_algorithm] * len(epsilons), width,
            bottom=[ppr_preprocessing] * len(epsilons),
            label='PPR Algorithm', color='#C73E1D', alpha=0.8)

    ax3.set_xlabel('Epsilon (PUSH)', fontsize=12)
    ax3.set_ylabel('Temps (ms)', fontsize=12)
    ax3.set_title('Décomposition du temps d\'exécution', fontsize=14, fontweight='bold')
    ax3.set_xticks(x)
    ax3.set_xticklabels([f'{e:.0e}' for e in epsilons])
    ax3.legend(fontsize=10, ncol=2)
    ax3.grid(True, alpha=0.3, axis='y')

    # Don't use tight_layout with GridSpec, just save with bbox_inches='tight'
    output_file = plots_dir / 'push_vs_ppr_analysis.png'
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"✓ Graphique sauvegardé : {output_file}")
    plt.close()

def plot_push_operations(results_dir):
    """Graphique des opérations PUSH."""
    results_dir = Path(results_dir)
    push_dir = get_path(results_dir, 'push')
    plots_dir = get_path(results_dir, 'plots')

    # Try multiple runs first
    data = load_multiple_compare_runs(push_dir, "compare_seed0_run*.json")

    if not data:
        # Fallback to single file
        compare_files = [
            push_dir / "compare_seed0.json",
            results_dir / "push_vs_ppr_seed0.json",  # Old location
            results_dir / "test_compare.json"
        ]

        for compare_file in compare_files:
            if compare_file.exists():
                data = load_json(compare_file)
                break

    if not data:
        print("Aucune donnée de comparaison PUSH trouvée, graphique ignoré")
        return

    push_results = data['push']

    epsilons = [p['epsilon'] for p in push_results]
    push_ops = [p['pushOperations'] for p in push_results]
    push_ops_std = [p.get('pushOperations_std', 0) for p in push_results]
    nodes_processed = [p['nodesProcessed'] for p in push_results]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # Push operations vs epsilon
    ax1.errorbar(epsilons, push_ops, yerr=push_ops_std, fmt='o-',
                 linewidth=2, markersize=10, color='#2E86AB', capsize=5)
    ax1.set_xlabel('Epsilon', fontsize=12)
    ax1.set_ylabel('Nombre d\'opérations PUSH', fontsize=12)
    ax1.set_title('Opérations PUSH vs Epsilon', fontsize=14, fontweight='bold')
    ax1.set_xscale('log')
    ax1.set_yscale('log')
    ax1.grid(True, alpha=0.3)
    ax1.invert_xaxis()

    # Nodes processed vs epsilon
    ax2.semilogx(epsilons, nodes_processed, 's-', linewidth=2, markersize=10, color='#A23B72')
    ax2.set_xlabel('Epsilon', fontsize=12)
    ax2.set_ylabel('Nombre de nœuds traités', fontsize=12)
    ax2.set_title('Nœuds traités vs Epsilon', fontsize=14, fontweight='bold')
    ax2.grid(True, alpha=0.3)
    ax2.invert_xaxis()

    plt.tight_layout()
    output_file = plots_dir / 'push_operations_analysis.png'
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"✓ Graphique sauvegardé : {output_file}")
    plt.close()


def plot_scalability(scalability_dir):
    """Graphiques de scalabilité en fonction de la taille du graphe."""
    scalability_dir = Path(scalability_dir)
    plots_dir = scalability_dir.parent / PATHS['plots']

    # Trouver toutes les tailles de graphes
    sizes = set()

    # New format: size_* subdirectories
    for size_dir in scalability_dir.glob("size_*"):
        if size_dir.is_dir():
            size = int(size_dir.name.split('_')[1])
            sizes.add(size)

    # Old format: files directly in scalability_dir
    if not sizes:
        for file in scalability_dir.glob("graph_*_run*.json"):
            parts = file.stem.split('_')
            size = int(parts[1])
            sizes.add(size)

        # Also check for old format (without runs)
        for file in scalability_dir.glob("graph_*.json"):
            if "_run" not in file.stem:
                size = int(file.stem.split('_')[1])
                sizes.add(size)

    sizes = sorted(list(sizes))

    if not sizes:
        print("Aucune donnée de scalabilité trouvée, graphique ignoré")
        return

    print(f"Génération des graphiques de scalabilité ({len(sizes)} tailles)...")

    # Données à collecter
    # Utiliser le format avec zéros pour correspondre au formatage Python
    pr_data = {tol: {'sizes': [], 'iterations': [], 'times': []} for tol in ['1e-03', '1e-05', '1e-07']}
    ppr_data = {tol: {'sizes': [], 'iterations': [], 'times': []} for tol in ['1e-03', '1e-05', '1e-07']}
    push_data = {eps: {'sizes': [], 'times': [], 'speedups': [], 'l1s': [], 'operations': []} for eps in ['1e-02', '1e-03', '1e-04', '1e-05']}

    # Charger les données
    for size in sizes:
        # Check for new format first (size_* subdirectories)
        size_dir = scalability_dir / f"size_{size}"
        if size_dir.exists():
            pr_run_files = sorted(size_dir.glob(f"pr_conv_run*.json"))
            ppr_run_files = sorted(size_dir.glob(f"ppr_conv_run*.json"))
            compare_run_files = sorted(size_dir.glob(f"compare_run*.json"))
        else:
            # Old format: files directly in scalability_dir
            pr_run_files = sorted(scalability_dir.glob(f"pr_conv_{size}_run*.json"))
            ppr_run_files = sorted(scalability_dir.glob(f"ppr_conv_{size}_run*.json"))
            compare_run_files = sorted(scalability_dir.glob(f"compare_{size}_run*.json"))

        # PageRank convergence
        if pr_run_files:
            # Multiple runs - aggregate data
            for pr_file in pr_run_files:
                pr_results = load_json(pr_file)
                results_array = pr_results if isinstance(pr_results, list) else pr_results.get('results', [])
                for result in results_array:
                    tol_str = f"{result['tolerance']:.0e}"
                    if tol_str in pr_data:
                        pr_data[tol_str]['sizes'].append(size)
                        pr_data[tol_str]['iterations'].append(result['iterations'])
                        pr_data[tol_str]['times'].append(result['executionTimeMs'])
        else:
            # Single file fallback
            pr_file = scalability_dir / f"pr_conv_{size}.json"
            if pr_file.exists():
                pr_results = load_json(pr_file)
                results_array = pr_results if isinstance(pr_results, list) else pr_results.get('results', [])
                for result in results_array:
                    tol_str = f"{result['tolerance']:.0e}"
                    if tol_str in pr_data:
                        pr_data[tol_str]['sizes'].append(size)
                        pr_data[tol_str]['iterations'].append(result['iterations'])
                        pr_data[tol_str]['times'].append(result['executionTimeMs'])

        # PPR convergence
        if ppr_run_files:
            # Multiple runs - aggregate data
            for ppr_file in ppr_run_files:
                ppr_results = load_json(ppr_file)
                results_array = ppr_results if isinstance(ppr_results, list) else ppr_results.get('results', [])
                for result in results_array:
                    tol_str = f"{result['tolerance']:.0e}"
                    if tol_str in ppr_data:
                        ppr_data[tol_str]['sizes'].append(size)
                        ppr_data[tol_str]['iterations'].append(result['iterations'])
                        ppr_data[tol_str]['times'].append(result['executionTimeMs'])
        else:
            # Single file fallback
            ppr_file = scalability_dir / f"ppr_conv_{size}.json"
            if ppr_file.exists():
                ppr_results = load_json(ppr_file)
                results_array = ppr_results if isinstance(ppr_results, list) else ppr_results.get('results', [])
                for result in results_array:
                    tol_str = f"{result['tolerance']:.0e}"
                    if tol_str in ppr_data:
                        ppr_data[tol_str]['sizes'].append(size)
                        ppr_data[tol_str]['iterations'].append(result['iterations'])
                        ppr_data[tol_str]['times'].append(result['executionTimeMs'])

        # PUSH vs PPR comparison
        if compare_run_files:
            # Multiple runs - aggregate data
            for compare_file in compare_run_files:
                compare_results = load_json(compare_file)
                for i, push_result in enumerate(compare_results['push']):
                    eps_str = f"{push_result['epsilon']:.0e}"
                    if eps_str in push_data:
                        push_data[eps_str]['sizes'].append(size)
                        push_data[eps_str]['times'].append(push_result['executionTimeMs'])
                        push_data[eps_str]['operations'].append(push_result['pushOperations'])
                        speedup_val = compare_results['speedup'][i].get('speedupFactorTotal',
                                      compare_results['speedup'][i].get('speedupFactor', 1))
                        push_data[eps_str]['speedups'].append(speedup_val)
                        push_data[eps_str]['l1s'].append(push_result['comparison']['l1Distance'])
        else:
            # Single file fallback
            compare_file = scalability_dir / f"compare_{size}.json"
            if compare_file.exists():
                compare_results = load_json(compare_file)
                for i, push_result in enumerate(compare_results['push']):
                    eps_str = f"{push_result['epsilon']:.0e}"
                    if eps_str in push_data:
                        push_data[eps_str]['sizes'].append(size)
                        push_data[eps_str]['times'].append(push_result['executionTimeMs'])
                        push_data[eps_str]['operations'].append(push_result['pushOperations'])
                        speedup_val = compare_results['speedup'][i].get('speedupFactorTotal',
                                      compare_results['speedup'][i].get('speedupFactor', 1))
                        push_data[eps_str]['speedups'].append(speedup_val)
                        push_data[eps_str]['l1s'].append(push_result['comparison']['l1Distance'])

    # Calculer les moyennes par taille pour chaque tolérance
    def average_by_size(data_dict):
        """Calcule la moyenne et l'écart-type pour chaque taille."""
        averaged = {}
        for key, values in data_dict.items():
            if not values['sizes']:
                continue

            # Grouper par taille
            size_groups = defaultdict(lambda: {'iterations': [], 'times': []})
            for i, size in enumerate(values['sizes']):
                size_groups[size]['iterations'].append(values['iterations'][i])
                size_groups[size]['times'].append(values['times'][i])

            # Calculer les moyennes
            sizes_sorted = sorted(size_groups.keys())
            averaged[key] = {
                'sizes': sizes_sorted,
                'iterations': [np.mean(size_groups[s]['iterations']) for s in sizes_sorted],
                'iterations_std': [np.std(size_groups[s]['iterations']) for s in sizes_sorted],
                'times': [np.mean(size_groups[s]['times']) for s in sizes_sorted],
                'times_std': [np.std(size_groups[s]['times']) for s in sizes_sorted]
            }
        return averaged

    pr_averaged = average_by_size(pr_data)
    ppr_averaged = average_by_size(ppr_data)

    # ========== GRAPHIQUE 1: PageRank ==========
    fig_pr, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # PageRank: Itérations vs Taille
    for tol, data in pr_averaged.items():
        if data['sizes']:
            ax1.errorbar(data['sizes'], data['iterations'], yerr=data['iterations_std'],
                        fmt='o-', label=f'tol={tol}', linewidth=2, markersize=8, capsize=5)
    ax1.set_xlabel('Taille du graphe (nœuds)', fontsize=12)
    ax1.set_ylabel('Itérations', fontsize=12)
    ax1.set_title('PageRank: Convergence vs Taille', fontsize=14, fontweight='bold')
    if any(data['sizes'] for data in pr_averaged.values()):
        ax1.legend(fontsize=10)
    ax1.grid(True, alpha=0.3)
    ax1.set_xscale('log')

    # PageRank: Temps vs Taille
    for tol, data in pr_averaged.items():
        if data['sizes']:
            ax2.errorbar(data['sizes'], data['times'], yerr=data['times_std'],
                        fmt='o-', label=f'tol={tol}', linewidth=2, markersize=8, capsize=5)
    ax2.set_xlabel('Taille du graphe (nœuds)', fontsize=12)
    ax2.set_ylabel('Temps (ms)', fontsize=12)
    ax2.set_title('PageRank: Temps d\'exécution vs Taille', fontsize=14, fontweight='bold')
    if any(data['sizes'] for data in pr_averaged.values()):
        ax2.legend(fontsize=10)
    ax2.grid(True, alpha=0.3)
    ax2.set_xscale('log')
    ax2.set_yscale('log')

    plt.tight_layout()
    output_file_pr = plots_dir / "scalability_pagerank.png"
    plt.savefig(output_file_pr, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Graphique PageRank sauvegardé : {output_file_pr}")

    # ========== GRAPHIQUE 2: PPR ==========
    fig_ppr, (ax3, ax4) = plt.subplots(1, 2, figsize=(14, 5))

    # PPR: Itérations vs Taille
    for tol, data in ppr_averaged.items():
        if data['sizes']:
            ax3.errorbar(data['sizes'], data['iterations'], yerr=data['iterations_std'],
                        fmt='s-', label=f'tol={tol}', linewidth=2, markersize=8, capsize=5)
    ax3.set_xlabel('Taille du graphe (nœuds)', fontsize=12)
    ax3.set_ylabel('Itérations', fontsize=12)
    ax3.set_title('PPR: Convergence vs Taille', fontsize=14, fontweight='bold')
    if any(data['sizes'] for data in ppr_averaged.values()):
        ax3.legend(fontsize=10)
    ax3.grid(True, alpha=0.3)
    ax3.set_xscale('log')

    # PPR: Temps vs Taille
    for tol, data in ppr_averaged.items():
        if data['sizes']:
            ax4.errorbar(data['sizes'], data['times'], yerr=data['times_std'],
                        fmt='s-', label=f'tol={tol}', linewidth=2, markersize=8, capsize=5)
    ax4.set_xlabel('Taille du graphe (nœuds)', fontsize=12)
    ax4.set_ylabel('Temps (ms)', fontsize=12)
    ax4.set_title('PPR: Temps d\'exécution vs Taille', fontsize=14, fontweight='bold')
    if any(data['sizes'] for data in ppr_averaged.values()):
        ax4.legend(fontsize=10)
    ax4.grid(True, alpha=0.3)
    ax4.set_xscale('log')
    ax4.set_yscale('log')

    plt.tight_layout()
    output_file_ppr = plots_dir / "scalability_ppr.png"
    plt.savefig(output_file_ppr, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Graphique PPR sauvegardé : {output_file_ppr}")

    # Calculer les moyennes pour PUSH
    def average_push_by_size(push_dict):
        """Calcule la moyenne et l'écart-type pour chaque taille (PUSH)."""
        averaged = {}
        for key, values in push_dict.items():
            if not values['sizes']:
                continue

            # Grouper par taille
            size_groups = defaultdict(lambda: {'operations': [], 'times': [], 'speedups': [], 'l1s': []})
            for i, size in enumerate(values['sizes']):
                if i < len(values['operations']):
                    size_groups[size]['operations'].append(values['operations'][i])
                if i < len(values['times']):
                    size_groups[size]['times'].append(values['times'][i])
                if i < len(values['speedups']):
                    size_groups[size]['speedups'].append(values['speedups'][i])
                if i < len(values['l1s']):
                    size_groups[size]['l1s'].append(values['l1s'][i])

            # Calculer les moyennes
            sizes_sorted = sorted(size_groups.keys())
            averaged[key] = {
                'sizes': sizes_sorted,
                'operations': [np.mean(size_groups[s]['operations']) if size_groups[s]['operations'] else 0 for s in sizes_sorted],
                'operations_std': [np.std(size_groups[s]['operations']) if size_groups[s]['operations'] else 0 for s in sizes_sorted],
                'times': [np.mean(size_groups[s]['times']) if size_groups[s]['times'] else 0 for s in sizes_sorted],
                'times_std': [np.std(size_groups[s]['times']) if size_groups[s]['times'] else 0 for s in sizes_sorted],
                'speedups': [np.mean(size_groups[s]['speedups']) if size_groups[s]['speedups'] else 0 for s in sizes_sorted],
                'speedups_std': [np.std(size_groups[s]['speedups']) if size_groups[s]['speedups'] else 0 for s in sizes_sorted],
                'l1s': [np.mean(size_groups[s]['l1s']) if size_groups[s]['l1s'] else 0 for s in sizes_sorted],
                'l1s_std': [np.std(size_groups[s]['l1s']) if size_groups[s]['l1s'] else 0 for s in sizes_sorted]
            }
        return averaged

    push_averaged = average_push_by_size(push_data)

    # ========== GRAPHIQUE 3: PUSH (solo) ==========
    fig_push, (ax5, ax6) = plt.subplots(1, 2, figsize=(14, 5))

    # PUSH: Opérations PUSH vs Taille
    for eps, data in push_averaged.items():
        if data['sizes'] and data['operations']:
            ax5.errorbar(data['sizes'], data['operations'], yerr=data['operations_std'],
                        fmt='^-', label=f'ε={eps}', linewidth=2, markersize=8, capsize=5)
    ax5.set_xlabel('Taille du graphe (nœuds)', fontsize=12)
    ax5.set_ylabel('Nombre d\'opérations PUSH', fontsize=12)
    ax5.set_title('PUSH: Opérations vs Taille', fontsize=14, fontweight='bold')
    if any(data['sizes'] for data in push_averaged.values()):
        ax5.legend(fontsize=10)
    ax5.grid(True, alpha=0.3)
    ax5.set_xscale('log')
    ax5.set_yscale('log')

    # PUSH: Temps d'exécution vs Taille
    for eps, data in push_averaged.items():
        if data['sizes']:
            ax6.errorbar(data['sizes'], data['times'], yerr=data['times_std'],
                        fmt='^-', label=f'ε={eps}', linewidth=2, markersize=8, capsize=5)
    ax6.set_xlabel('Taille du graphe (nœuds)', fontsize=12)
    ax6.set_ylabel('Temps (ms)', fontsize=12)
    ax6.set_title('PUSH: Temps d\'exécution vs Taille', fontsize=14, fontweight='bold')
    if any(data['sizes'] for data in push_averaged.values()):
        ax6.legend(fontsize=10)
    ax6.grid(True, alpha=0.3)
    ax6.set_xscale('log')
    ax6.set_yscale('log')

    plt.tight_layout()
    output_file_push = plots_dir / "scalability_push.png"
    plt.savefig(output_file_push, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Graphique PUSH sauvegardé : {output_file_push}")

    # ========== GRAPHIQUE 4: PUSH vs PPR (comparaison) ==========
    fig_push_vs_ppr, (ax7, ax8) = plt.subplots(1, 2, figsize=(14, 5))

    # PUSH: Speedup vs Taille
    for eps, data in push_averaged.items():
        if data['sizes']:
            ax7.errorbar(data['sizes'], data['speedups'], yerr=data['speedups_std'],
                        fmt='^-', label=f'ε={eps}', linewidth=2, markersize=8, capsize=5)
    ax7.axhline(y=1, color='r', linestyle='--', alpha=0.5, label='Speedup=1')
    ax7.set_xlabel('Taille du graphe (nœuds)', fontsize=12)
    ax7.set_ylabel('Speedup (PUSH vs PPR)', fontsize=12)
    ax7.set_title('PUSH vs PPR: Speedup vs Taille', fontsize=14, fontweight='bold')
    if any(data['sizes'] for data in push_averaged.values()):
        ax7.legend(fontsize=10)
    ax7.grid(True, alpha=0.3)
    ax7.set_xscale('log')

    # PUSH: Précision (L1) vs Taille
    for eps, data in push_averaged.items():
        if data['sizes']:
            ax8.errorbar(data['sizes'], data['l1s'], yerr=data['l1s_std'],
                        fmt='^-', label=f'ε={eps}', linewidth=2, markersize=8, capsize=5)
    ax8.set_xlabel('Taille du graphe (nœuds)', fontsize=12)
    ax8.set_ylabel('Distance L1', fontsize=12)
    ax8.set_title('PUSH vs PPR: Précision vs Taille', fontsize=14, fontweight='bold')
    if any(data['sizes'] for data in push_averaged.values()):
        ax8.legend(fontsize=10)
    ax8.grid(True, alpha=0.3)
    ax8.set_xscale('log')
    ax8.set_yscale('log')

    plt.tight_layout()
    output_file_push_vs_ppr = plots_dir / "scalability_push_vs_ppr.png"
    plt.savefig(output_file_push_vs_ppr, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Graphique PUSH vs PPR sauvegardé : {output_file_push_vs_ppr}")

def plot_damping(results_dir):
    """Graphiques d'analyse du damping pour PageRank."""

    import json
    import numpy as np
    import matplotlib.pyplot as plt
    from pathlib import Path

    damping_dir = get_path(results_dir, 'pagerank_damping')
    plots_dir = get_path(results_dir, 'plots')

    # Try multiple runs first
    damping_values = [0.10, 0.30, 0.50, 0.65, 0.75, 0.85, 0.90, 0.95, 1.0]

    dampings = []
    avg_iters = []
    std_iters = []

    for damping in damping_values:
        damping_str = str(damping).replace(".", "_")
        pattern = f"pr_damping_{damping_str}_run*.json"
        files = sorted(damping_dir.glob(pattern))

        if files:
            # Multiple runs - calculate average
            all_iterations = []
            for f in files:
                with open(f) as fp:
                    data = json.load(fp)
                    iterations = [r["iterations"] for r in data]
                    all_iterations.extend(iterations)

            dampings.append(damping)
            avg_iters.append(np.mean(all_iterations))
            std_iters.append(np.std(all_iterations))
        else:
            # Try single file
            single_file = damping_dir / f"pr_damping_{damping_str}.json"
            if single_file.exists():
                with open(single_file) as fp:
                    data = json.load(fp)
                    iterations = [r["iterations"] for r in data]
                    dampings.append(damping)
                    avg_iters.append(np.mean(iterations))
                    std_iters.append(0)

    if not dampings:
        print("Aucun fichier de damping trouvé dans", damping_dir)
        return

    fig, ax1 = plt.subplots(figsize=(7, 4))
    ax1.errorbar(dampings, avg_iters, yerr=std_iters, marker='o',
                 color='tab:blue', capsize=5, linewidth=2, markersize=8)
    ax1.set_xlabel("Facteur de damping", fontsize=12)
    ax1.set_ylabel("Itérations moyennes", fontsize=12)
    ax1.set_title("Itérations moyennes selon le facteur de damping", fontsize=14, fontweight='bold')
    ax1.grid(True, linestyle="--", alpha=0.5)

    output_file = plots_dir / "pagerank_damping_avg.png"
    plt.tight_layout()
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"✓ Graphique sauvegardé : {output_file}")
    plt.close()



def main():
    if len(sys.argv) < 2:
        print("Usage: python visualize.py <results_directory>")
        print()
        print("Exemple:")
        print("  python visualize.py test_results/")
        print("  python visualize.py results/")
        sys.exit(1)

    results_dir = Path(sys.argv[1])

    if not results_dir.exists():
        print(f"Erreur : Le répertoire {results_dir} n'existe pas")
        sys.exit(1)

    print("=" * 60)
    print("Génération des graphiques d'analyse")
    print("=" * 60)
    print()

    graphs_generated = 0

    try:
        plot_convergence(results_dir)
        graphs_generated += 1
    except Exception as e:
        print(f"Erreur lors de la génération du graphique de convergence: {e}")

    try:
        plot_communities(results_dir)
        graphs_generated += 1
    except Exception as e:
        print(f"Erreur lors de la génération du graphique de communautés: {e}")

    try:
        plot_push_vs_ppr(results_dir)
        graphs_generated += 1
    except Exception as e:
        print(f"Erreur lors de la génération du graphique PUSH vs PPR: {e}")

    try:
        plot_push_operations(results_dir)
        graphs_generated += 1
    except Exception as e:
        print(f"Erreur lors de la génération du graphique des opérations PUSH: {e}")

    try:
        plot_damping(results_dir)
        graphs_generated += 1
    except Exception as e:
        print(f"Erreur lors de la génération du graphique de damping: {e}")

    # Check for scalability results
    scalability_dir = results_dir / "scalability"
    if scalability_dir.exists():
        try:
            plot_scalability(scalability_dir)
            graphs_generated += 1
        except Exception as e:
            print(f"Erreur lors de la génération du graphique de scalabilité: {e}")

    print()
    print("=" * 60)
    if graphs_generated > 0:
        print(f"{graphs_generated} graphique(s) généré(s) avec succès !")
    else:
        print("Aucun graphique n'a pu être généré")
        print("Vérifiez que les fichiers de résultats existent dans le répertoire")
    print("=" * 60)

if __name__ == "__main__":
    main()


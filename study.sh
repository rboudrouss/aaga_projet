#!/bin/bash

# Script d'étude complète des algorithmes PageRank, PPR et PUSH
# Ce script génère des données pour analyser :
# 1. La convergence du PR et PPR en fonction de la précision
# 2. Les communautés locales détectées par PPR
# 3. La comparaison entre PUSH et PPR
# 4. L'impact de la taille du graphe (scalabilité)
#
# Structure des répertoires de sortie:
#   output_dir/
#   ├── graphs/                    # Graphes générés
#   ├── pagerank/
#   │   ├── convergence/          # Tests de convergence PR
#   │   └── damping/              # Tests de damping factor
#   ├── ppr/
#   │   ├── convergence/          # Tests de convergence PPR
#   │   └── community/
#   │       ├── threshold/        # Communautés par seuil
#   │       └── seed/             # Communautés par seed
#   ├── push/
#   │   ├── compare_*.json        # Comparaisons PUSH vs PPR
#   │   └── tolerance/            # Tests avec différentes tolérances
#   ├── scalability/
#   │   └── size_*/               # Tests par taille de graphe
#   └── plots/                    # Tous les graphiques générés
#
# Usage:
#   ./study.sh [output_dir] [flags]
#
# Arguments:
#   output_dir    Répertoire de sortie (défaut: results)
#
# Flags (si aucun flag n'est passé, tout est exécuté):
#   --pr-conv         Convergence PageRank
#   --ppr-conv        Convergence PPR
#   --community       Détection de communautés
#   --compare         Comparaison PUSH vs PPR
#   --scalability     Étude de scalabilité
#   --all             Exécuter toutes les analyses (défaut)
#   --runs <N>        Nombre de tests à générer (défaut: 10)
#   -v, --visualize   Lancer visualize.py après génération
#
# Exemples:
#   ./study.sh                           # Tout exécuter dans results/
#   ./study.sh my_results                # Tout exécuter dans my_results/
#   ./study.sh results --scalability     # Seulement scalabilité
#   ./study.sh results --pr-conv --ppr-conv  # Seulement convergence
#   ./study.sh results --runs 20         # 20 tests au lieu de 10

set -e

# Parse arguments
OUTPUT_DIR="results"
RUN_PR_CONV=false
RUN_PPR_CONV=false
RUN_COMMUNITY=false
RUN_COMPARE=false
RUN_SCALABILITY=false
RUN_ALL=true
RUN_VISUALIZE=false
NUM_RUNS=10
# Premier argument = répertoire de sortie (si ce n'est pas un flag)

if [[ $# -gt 0 && ! "$1" =~ ^-- && ! "$1" =~ ^-v$ && ! "$1" =~ ^--visualize$ ]]; then
  OUTPUT_DIR="$1"
  shift
fi
# Parser les flags
while [[ $# -gt 0 ]]; do
  case $1 in
    --pr-conv)
      RUN_PR_CONV=true
      RUN_ALL=false
      shift
      ;;
    --ppr-conv)
      RUN_PPR_CONV=true
      RUN_ALL=false
      shift
      ;;
    --community)
      RUN_COMMUNITY=true
      RUN_ALL=false
      shift
      ;;
    --compare)
      RUN_COMPARE=true
      RUN_ALL=false
      shift
      ;;
    --scalability)
      RUN_SCALABILITY=true
      RUN_ALL=false
      shift
      ;;
    --all)
      RUN_ALL=true
      shift
      ;;
    --runs)
      NUM_RUNS="$2"
      shift 2
      ;;
    -v|--visualize)
      RUN_VISUALIZE=true; shift ;;
    *)
      echo "Flag inconnu: $1"
      echo "Flags disponibles: --pr-conv, --ppr-conv, --community, --compare, --scalability, --all, --runs <N>"
      exit 1
      ;;
  esac
done

# Si RUN_ALL, activer tous les flags
if [ "$RUN_ALL" = true ]; then
  RUN_PR_CONV=true
  RUN_PPR_CONV=true
  RUN_COMMUNITY=true
  RUN_COMPARE=true
  RUN_SCALABILITY=true
fi

# Créer la structure de répertoires
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/graphs"
mkdir -p "$OUTPUT_DIR/pagerank/convergence"
mkdir -p "$OUTPUT_DIR/pagerank/damping"
mkdir -p "$OUTPUT_DIR/ppr/convergence"
mkdir -p "$OUTPUT_DIR/ppr/community/threshold"
mkdir -p "$OUTPUT_DIR/ppr/community/seed"
mkdir -p "$OUTPUT_DIR/push"
mkdir -p "$OUTPUT_DIR/push/tolerance"
mkdir -p "$OUTPUT_DIR/scalability"
mkdir -p "$OUTPUT_DIR/plots"

echo "Répertoire de sortie: $OUTPUT_DIR"
echo "Nombre de runs: $NUM_RUNS"
echo ""
echo "Analyses à exécuter:"
[ "$RUN_PR_CONV" = true ] && echo "  - Convergence PageRank"
[ "$RUN_PPR_CONV" = true ] && echo "  - Convergence PPR"
[ "$RUN_COMMUNITY" = true ] && echo "  - Détection de communautés"
[ "$RUN_COMPARE" = true ] && echo "  - Comparaison PUSH vs PPR"
[ "$RUN_SCALABILITY" = true ] && echo "  - Étude de scalabilité"
[ "$RUN_VISUALIZE" = true ] && echo "  - Visualisation automatique (visualise.py)"
echo ""

if [ "$RUN_PR_CONV" = true ]; then
  echo "=== 1. Étude de convergence du PageRank (${NUM_RUNS} runs) ==="
  for run in $(seq 1 $NUM_RUNS); do
    echo "  Run $run/$NUM_RUNS..."
    # Générer un nouveau graphe pour chaque run
    ./cli generate --nodes 50 -p 0.08 --seed $run -o "$OUTPUT_DIR/graphs/graph_run${run}.json" > /dev/null

    ./cli convergence \
      -a pagerank \
      -f "$OUTPUT_DIR/graphs/graph_run${run}.json" \
      -t "1e-2,1e-3,1e-4,1e-5,1e-6,1e-7,1e-8,1e-9" \
      -o "$OUTPUT_DIR/pagerank/convergence/pr_convergence_run${run}.json"
  done
  echo "Résultats sauvegardés : $OUTPUT_DIR/pagerank/convergence/"
  echo ""

  echo "=== 2: Etude des differents valeurs de damping (${NUM_RUNS} runs) ==="
  dampings=(0.10 0.30 0.50 0.65 0.75 0.85 0.90 0.95 1)
  sweep_tol="1e-6"
  for damping in "${dampings[@]}"; do
    damping_str=$(echo "$damping" | tr '.' '_')
    echo "  damping=$damping..."
    for run in $(seq 1 $NUM_RUNS); do
      outfile="$OUTPUT_DIR/pagerank/damping/pr_damping_${damping_str}_run${run}.json"
      ./cli convergence \
        -a pagerank \
        -f "$OUTPUT_DIR/graphs/graph_run${run}.json" \
        --damping "$damping" \
        -t "$sweep_tol" \
        -o "$outfile"
    done
  done
  echo "Résultats sauvegardés : $OUTPUT_DIR/pagerank/damping/"
  echo ""
fi

if [ "$RUN_PPR_CONV" = true ]; then
  echo "=== 3. Étude de convergence du PPR (seed=0, ${NUM_RUNS} runs) ==="
  for run in $(seq 1 $NUM_RUNS); do
    echo "  Run $run/$NUM_RUNS..."
    # Utiliser le graphe déjà généré ou en créer un nouveau
    if [ ! -f "$OUTPUT_DIR/graphs/graph_run${run}.json" ]; then
      ./cli generate --nodes 50 -p 0.08 --seed $run -o "$OUTPUT_DIR/graphs/graph_run${run}.json" > /dev/null
    fi

    ./cli convergence \
      -a ppr \
      -f "$OUTPUT_DIR/graphs/graph_run${run}.json" \
      -s "0" \
      -t "1e-2,1e-3,1e-4,1e-5,1e-6,1e-7,1e-8,1e-9" \
      -o "$OUTPUT_DIR/ppr/convergence/ppr_convergence_seed0_run${run}.json"
  done
  echo "Résultats sauvegardés : $OUTPUT_DIR/ppr/convergence/"
  echo ""

  echo "=== 4. Étude de convergence du PPR (seeds=0,10,20, ${NUM_RUNS} runs) ==="
  for run in $(seq 1 $NUM_RUNS); do
    echo "  Run $run/$NUM_RUNS..."
    ./cli convergence \
      -a ppr \
      -f "$OUTPUT_DIR/graphs/graph_run${run}.json" \
      -s "0,10,20" \
      -t "1e-2,1e-3,1e-4,1e-5,1e-6,1e-7,1e-8,1e-9" \
      -o "$OUTPUT_DIR/ppr/convergence/ppr_convergence_multi_run${run}.json"
  done
  echo "Résultats sauvegardés : $OUTPUT_DIR/ppr/convergence/"
  echo ""
fi

if [ "$RUN_COMMUNITY" = true ]; then
  echo "=== 5. Détection de communautés avec différents seuils (${NUM_RUNS} runs) ==="
  for threshold in 0.1 0.05 0.02 0.01 0.005 0.001; do
    echo "  Seuil: $threshold..."
    for run in $(seq 1 $NUM_RUNS); do
      if [ ! -f "$OUTPUT_DIR/graphs/graph_run${run}.json" ]; then
        ./cli generate --nodes 50 -p 0.08 --seed $run -o "$OUTPUT_DIR/graphs/graph_run${run}.json" > /dev/null
      fi
      ./cli community \
        -f "$OUTPUT_DIR/graphs/graph_run${run}.json" \
        -s "0" \
        -t $threshold \
        -o "$OUTPUT_DIR/ppr/community/threshold/community_threshold_${threshold}_run${run}.json"
    done
  done
  echo "Résultats sauvegardés : $OUTPUT_DIR/ppr/community/threshold/"
  echo ""

  echo "=== 6. Détection de communautés autour de différents seeds (${NUM_RUNS} runs) ==="
  for seed in 0 10 20 30; do
    echo "  Seed: $seed..."
    for run in $(seq 1 $NUM_RUNS); do
      ./cli community \
        -f "$OUTPUT_DIR/graphs/graph_run${run}.json" \
        -s "$seed" \
        -t 0.01 \
        -o "$OUTPUT_DIR/ppr/community/seed/community_seed_${seed}_run${run}.json"
    done
  done
  echo "Résultats sauvegardés : $OUTPUT_DIR/ppr/community/seed/"
  echo ""
fi

if [ "$RUN_COMPARE" = true ]; then
  echo "=== 7. Comparaison PUSH vs PPR (seed=0, ${NUM_RUNS} runs) ==="
  for run in $(seq 1 $NUM_RUNS); do
    echo "  Run $run/$NUM_RUNS..."
    if [ ! -f "$OUTPUT_DIR/graphs/graph_run${run}.json" ]; then
      ./cli generate --nodes 50 -p 0.08 --seed $run -o "$OUTPUT_DIR/graphs/graph_run${run}.json" > /dev/null
    fi
    ./cli compare \
      -f "$OUTPUT_DIR/graphs/graph_run${run}.json" \
      -s "0" \
      -e "1e-2,5e-3,1e-3,5e-4,1e-4,5e-5,1e-5,1e-6" \
      -t 1e-7 \
      --community-threshold 0.01 \
      -o "$OUTPUT_DIR/push/compare_seed0_run${run}.json"
  done
  echo "Résultats sauvegardés : $OUTPUT_DIR/push/"
  echo ""

  echo "=== 8. Comparaison PUSH vs PPR (seeds=0,10,20, ${NUM_RUNS} runs) ==="
  for run in $(seq 1 $NUM_RUNS); do
    echo "  Run $run/$NUM_RUNS..."
    ./cli compare \
      -f "$OUTPUT_DIR/graphs/graph_run${run}.json" \
      -s "0,10,20" \
      -e "1e-2,5e-3,1e-3,5e-4,1e-4,5e-5,1e-5,1e-6" \
      -t 1e-7 \
      --community-threshold 0.01 \
      -o "$OUTPUT_DIR/push/compare_multi_run${run}.json"
  done
  echo "Résultats sauvegardés : $OUTPUT_DIR/push/"
  echo ""

  echo "=== 9. Comparaison PUSH vs PPR avec différentes tolérances PPR (${NUM_RUNS} runs) ==="
  for tolerance in 1e-4 1e-5 1e-6 1e-7 1e-8; do
    echo "  Tolérance PPR: $tolerance..."
    for run in $(seq 1 $NUM_RUNS); do
      ./cli compare \
        -f "$OUTPUT_DIR/graphs/graph_run${run}.json" \
        -s "0" \
        -e "1e-3,1e-4,1e-5,1e-6" \
        -t $tolerance \
        --community-threshold 0.01 \
        -o "$OUTPUT_DIR/push/tolerance/compare_tol_${tolerance}_run${run}.json"
    done
  done
  echo "Résultats sauvegardés : $OUTPUT_DIR/push/tolerance/"
  echo ""
fi

if [ "$RUN_SCALABILITY" = true ]; then
  echo "=== 10. Étude de l'impact de la taille du graphe (${NUM_RUNS} runs) ==="

  sizes=(10 20 50 100 200 500)
  echo "Mode complet : 6 tailles de graphes (10, 20, 50, 100, 200, 500 nœuds)"
  echo ""

  for size in "${sizes[@]}"; do
    echo ""
    echo "  --- Graphe de taille $size ---"

    # Créer un sous-répertoire pour cette taille
    mkdir -p "$OUTPUT_DIR/scalability/size_${size}"

    for run in $(seq 1 $NUM_RUNS); do
      echo "    Run $run/$NUM_RUNS..."

      # Générer le graphe
      ./cli generate --nodes $size -p 0.08 --seed $run -o "$OUTPUT_DIR/scalability/size_${size}/graph_run${run}.json" > /dev/null

      # Convergence PageRank
      ./cli convergence \
        -a pagerank \
        -f "$OUTPUT_DIR/scalability/size_${size}/graph_run${run}.json" \
        -t "1e-3,1e-5,1e-7" \
        -o "$OUTPUT_DIR/scalability/size_${size}/pr_conv_run${run}.json"

      # Convergence PPR
      ./cli convergence \
        -a ppr \
        -f "$OUTPUT_DIR/scalability/size_${size}/graph_run${run}.json" \
        -s "0" \
        -t "1e-3,1e-5,1e-7" \
        -o "$OUTPUT_DIR/scalability/size_${size}/ppr_conv_run${run}.json"

      # Comparaison PUSH vs PPR
      ./cli compare \
        -f "$OUTPUT_DIR/scalability/size_${size}/graph_run${run}.json" \
        -s "0" \
        -e "1e-2,1e-3,1e-4,1e-5" \
        -t 1e-7 \
        --community-threshold 0.01 \
        -o "$OUTPUT_DIR/scalability/size_${size}/compare_run${run}.json"
    done
  done

  echo ""
  echo "Résultats de scalabilité sauvegardés : $OUTPUT_DIR/scalability/"
  echo ""
fi

# Visualisation automatique si -v est présent
if [ "$RUN_VISUALIZE" = true ]; then
  echo ""
  echo "=== Visualisation des résultats avec visualize.py ==="
  if [ -f "visualize.py" ]; then
    python3 visualize.py "$OUTPUT_DIR"
    echo "Visualisation terminée et enregistrée dans $OUTPUT_DIR/"
  else
    echo "Erreur : visualize.py introuvable dans le répertoire courant."
  fi
  echo ""
fi

echo ""
echo "Tous les résultats sont dans le répertoire '$OUTPUT_DIR/'"
echo ""
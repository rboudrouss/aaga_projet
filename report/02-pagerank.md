# 2. Implémentation

## 2.1. PageRank

### 2.1.1. Principe

L'algorithme PageRank mesure l'importance relative des nœuds dans un graphe orienté selon le principe du random surfer : un utilisateur navigue aléatoirement en suivant les liens, et le PageRank d'un nœud correspond à la probabilité stationnaire que cet utilisateur s'y trouve.

;Le facteur d'amortissement $d \in [0,1]$ modélise la probabilité d'un utilisateur  à suivre les liens (avec probabilité $d$) plutôt que de se téléporter aléatoirement sur une autre page, parfois sans lien (avec probabilité $1-d$). La formule pour un nœud $v$ est :

$$
PR(v) = \frac{1-d}{N} + d \sum_{u \in \text{In}(v)} \frac{PR(u)}{\text{deg}^+(u)}
$$

où $N$ est le nombre de nœuds, $\text{In}(v)$ l'ensemble des nœuds pointant vers $v$, et $\text{deg}^+(u)$ le degré sortant de $u$.

Les nœuds pendants (sans liens sortants) nécessitent un traitement particulier : leur PageRank est redistribué uniformément pour éviter qu'ils n'absorbent toute la probabilité. La formule devient :

$$
PR(v) = \frac{1-d}{N} + \frac{d \cdot S}{N} + d \sum_{u \in \text{In}(v)} \frac{PR(u)}{\text{deg}^+(u)}
$$

où $S = \sum_{u \in \text{Dangling}} PR(u)$ est la somme des PageRanks des nœuds pendants.

### 2.1.2. Implémentation

Notre implémentation (`src/pagerank.ts`) utilise la méthode de power iteration. Le prétraitement (fonction `preprocessGraph`) construit les listes d'arêtes entrantes, calcule les degrés sortants et identifie les nœuds pendants en complexité $O(N + M)$, où $N$ est le nombre de nœuds et $M$ le nombre d'arêtes du graphe.

L'algorithme principal initialise tous les nœuds à $PR^{(0)}(v) = \frac{1}{N}$ puis itère jusqu'à convergence :

*code de l'iteration:*
```typescript
const danglingSum = danglingNodes.reduce((acc, node) => acc + ranks[node], 0);
const baseRank = (1 - damping) / N + (damping * danglingSum) / N;

const newRanks = Array.from({ length: N }, (_, node) => {
  let rank = baseRank;
  incomingEdges[node].forEach((fromNode) => {
    rank += (damping * ranks[fromNode]) / outDegrees[fromNode];
  });
  return rank;
});
```

La convergence est vérifiée par la distance L1 entre deux itérations : $\sum_{v} |PR^{(t+1)}(v) - PR^{(t)}(v)| < \epsilon$.

```typescript
    // Check for convergence
    diff = newRanks.reduce(
      (acc, rank, index) => acc + Math.abs(rank - ranks[index]),
      0
    );

    ranks = newRanks;

    if (diff < tolerance) {
      console.log(`Converged after ${iter + 1} iterations`);
      break;
    }
  }

```
La complexité par itération est $O(N + M)$ : calcul de la somme des nœuds pendants en pire des cas $O(N)$, parcours des arêtes entrantes en $O(M)$, et calcul de la distance L1 en $O(N)$. La complexité totale est donc $O(k \cdot (N + M))$ où $k$ est le nombre d'itérations, qui dépend logarithmiquement de la tolérance $\epsilon$.
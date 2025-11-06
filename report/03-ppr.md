## 2.2. Personalized PageRank

### 2.2.1. Principe

Le Personalized PageRank (PPR) est une variante du PageRank classique qui permet de calculer l'importance des nœuds relativement à un ensemble de nœuds sources appelés seeds. Contrairement au PageRank où la téléportation se fait uniformément vers tous les nœuds, le PPR restreint la téléportation uniquement vers les seeds.

Cette modification permet d'obtenir un PageRank localisé autour des seeds : les nœuds proches des seeds obtiennent des scores élevés, tandis que les nœuds éloignés ont des scores faibles. Le PPR est particulièrement utile pour la détection de communautés locales, la recommandation personnalisée, ou l'analyse de proximité dans un graphe.

La formule du PPR pour un nœud $v$ est :

$$
PPR(v) = \begin{cases}
\frac{1-d}{|S|} + \frac{d \cdot D}{|S|} + d \sum_{u \in \text{In}(v)} \frac{PPR(u)}{\text{deg}^+(u)} & \text{si } v \in S \\
d \sum_{u \in \text{In}(v)} \frac{PPR(u)}{\text{deg}^+(u)} & \text{sinon}
\end{cases}
$$

où $S$ est l'ensemble des seeds, $|S|$ leur nombre, et $D = \sum_{u \in \text{Dangling}} PPR(u)$ la somme des scores des nœuds pendants. Seuls les seeds reçoivent la probabilité de téléportation et la redistribution des nœuds pendants.

### 2.2.2. Implémentation

Notre implémentation (`src/PPR.ts`) suit la même structure que PageRank avec des modifications pour gérer les seeds. Le prétraitement est identique (complexité $O(N + M)$) avec en plus la conversion et validation des seeds (lignes 71-80).

L'initialisation diffère du PageRank : seuls les seeds reçoivent un score initial non nul (lignes 95-98) :

```typescript
let ranks = new Array(N).fill(0);
seedIndices.forEach((idx) => {
  ranks[idx] = seedWeight;
});
```

où `seedWeight = 1 / seedIndices.length` assure que la somme initiale vaut 1.

L'algorithme principal calcule à chaque itération (lignes 111-126) :

```typescript
const newRanks = Array.from({ length: N }, (_, node) => {
  const isSeed = seedSet.has(node);
  const teleportation = isSeed ? teleportationWeight : 0;
  const danglingContribution = isSeed
    ? damping * danglingSum * seedWeight
    : 0;
  let rank = teleportation + danglingContribution;

  incomingEdges[node].forEach((fromNode) => {
    rank += (damping * ranks[fromNode]) / outDegrees[fromNode];
  });

  return rank;
});
```

La différence clé avec PageRank est que seuls les seeds (vérifiés par `seedSet.has(node)`) reçoivent la téléportation et la contribution des nœuds pendants. Les autres nœuds n'obtiennent de score que par propagation depuis leurs voisins entrants.

Le critère de convergence reste la distance L1 : $\sum_{v} |PPR^{(t+1)}(v) - PPR^{(t)}(v)| < \epsilon$.

La complexité par itération est identique à PageRank : $O(N + M)$. Le test d'appartenance aux seeds (`seedSet.has(node)`) est en $O(1)$ grâce à l'utilisation d'un `Set`. La complexité totale reste donc $O(k \cdot (N + M))$ où $k$ est le nombre d'itérations. En pratique, PPR converge souvent plus rapidement que PageRank car la distribution de probabilité est plus localisée autour des seeds.
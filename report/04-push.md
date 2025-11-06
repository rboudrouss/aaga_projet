## 2.3. Méthode PUSH

### 2.3.1. Principe

La méthode PUSH est un algorithme d'approximation locale du Personalized PageRank. Contrairement au PPR qui itère sur tous les nœuds du graphe jusqu'à convergence, PUSH ne traite que les nœuds ayant un résidu significatif, ce qui le rend particulièrement efficace pour les grands graphes.

L'algorithme maintient deux vecteurs : le vecteur de rang `rank` (approximation du PPR) et le vecteur de résidu `residual` (probabilité non encore distribuée). À chaque opération de push sur un nœud $v$, une partie du résidu est ajoutée au rang, et le reste est propagé aux voisins sortants. Le processus continue tant qu'il existe des nœuds avec un résidu supérieur au seuil $\epsilon$.

Le paramètre $\epsilon$ contrôle le compromis précision/performance : une valeur faible (ex: $10^{-6}$) donne une approximation très précise mais nécessite plus d'opérations, tandis qu'une valeur élevée (ex: $10^{-3}$) est plus rapide mais moins précise. En pratique, $\epsilon = 10^{-4}$ offre un bon équilibre.

L'opération de push sur un nœud $v$ avec résidu $r_v$ consiste à :
1. Ajouter $(1-d) \cdot r_v$ au rang de $v$
2. Distribuer $\frac{d \cdot r_v}{\text{deg}^+(v)}$ à chaque voisin sortant
3. Mettre le résidu de $v$ à zéro

Pour les nœuds pendants, le résidu est redistribué uniquement vers les seeds, comme dans le PPR.

### 2.3.2. Implémentation

Notre implémentation (`src/PUSH.ts`) utilise une file pour gérer les nœuds à traiter. Le prétraitement construit les listes d'arêtes sortantes (contrairement à PageRank et PPR qui utilisent les arêtes entrantes), en complexité $O(N + M)$.

L'initialisation (lignes 84-95) place tout le résidu sur les seeds avec `residual[idx] = seedWeight`, tandis que le vecteur `rank` est initialisé à zéro. Les seeds sont ajoutés à une file de traitement.

La boucle principale (lignes 101-150) extrait un nœud de la file et, si son résidu dépasse $\epsilon$, effectue l'opération de push :

```typescript
rank[node] += (1 - damping) * res;

const pushValue = (damping * res) / degree;
neighbors.forEach((neighbor) => {
  residual[neighbor] += pushValue;
  if (!inQueue.has(neighbor) && residual[neighbor] >= epsilon) {
    queue.push(neighbor);
  }
});
```

Pour les nœuds pendants (lignes 135-146), le résidu est redistribué vers les seeds uniquement, proportionnellement à `seedWeight`.

L'algorithme s'arrête lorsque tous les résidus sont inférieurs à $\epsilon$. Un nœud n'est ajouté à la file que si son résidu dépasse $\epsilon$, évitant ainsi de traiter les nœuds peu pertinents.

La complexité dépend du nombre d'opérations de push effectuées. Dans le pire cas (tous les nœuds traités), elle est $O(M/\epsilon)$. En pratique, pour un PPR localisé, seule une fraction du graphe est explorée, donnant une complexité sous-linéaire en $N$ et $M$. Le nombre d'opérations de push est typiquement $O(1/\epsilon)$ pour des graphes avec structure de communauté, rendant PUSH beaucoup plus rapide que PPR sur les grands graphes.
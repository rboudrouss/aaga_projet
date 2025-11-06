# 1. Introduction

Tout le code pour ce projet est disponible sur github [https://github.com/rboudrouss/aaga_projet](https://github.com/rboudrouss/aaga_projet)

## 1.1. Contexte

L'algorithme PageRank, conçu a la fin des années 1990 par les fondateurs de Google, permet de mesurer l'importance relative des pages web en fonction de la structure de leurs liens hypertextes.

On suppose qu’un utilisateur parcourt le web en cliquant aléatoirement sur les liens disponibles. Un "score" ou "rank" est alors attribué a chaque page par l'algorithme. D'un point de vue probabiliste, On peut dire que ce score représente la probabilité de visiter cette page après de nombreuses navigations.

Au début du calcul, cette probabilité est répartie uniformément entre toutes les pages du graphe. L’algorithme ajuste ensuite, par itérations successives, les valeurs de chaque rank jusqu’à atteindre une distribution stable. Par conséquent une page est considérée comme importante si elle est référencée par d’autres pages importantes.

Par ailleurs, PageRank dépasse aujourd’hui son usage initial et constitue une mesure de centralité largement utilisée en analyse de graphes, que ce soit dans des domaines comme les réseaux sociaux (pour identifier les utilisateurs les plus influents), la bio-informatique (pour étudier les interactions entre protéines ou gènes) ou encore l’analyse de citations scientifiques (pour mesurer l’impact d’un article ou d’un auteur).

Pour certaines de ces applications, il n’est pas suffisant de connaître l’importance globale de chaque noeud dans le graphe. Il peut être plus pertinent et moins couteux de se concentrer sur l’influence locale d’un noeud particulier ou d’un petit sous-ensemble de nœuds. La variante PPR (Personalized PageRank) repond a ce besoin.

Ici, la téléportation ne se fait pas uniformément vers tous les sommets du graphe, mais est concentrée sur un sommet source spécifique. Cette personnalisation permet de mesurer la proximité ou l’influence des autres nœuds par rapport à cette source, donnant un aperçu des communautés locales et de la structure du graphe autour d’un point d’intérêt particulier. Cependant, son calcul se révèle coûteux en temps et en mémoire sur de grand graphe ou sur de trop multiple sources.

La méthode PUSH propose une approche approximative mais efficace. Elle permet de concentrer le calcul sur les parties du graphe les plus pertinentes autour de la source, réduisant ainsi considérablement le temps de calcul.

## 1.2. Objectifs

Les objectifs de notre projet sont les suivants:

- Implémenter et étudier la convergence du PageRank classique et du PPR, en fonction de la précision souhaitée.
- Détecter et analyser les communautés locales autour d’un nœud source à l’aide du PPR.
- Mettre en œuvre une approximation du PPR via la méthode PUSH et comparer les résultats obtenus au PPR, en termes de précision que de temps de calcul.

## 1.3. Choix techniques

Pour l'implementation de ces algorithmes, nous avons choisi d'utiliser TypeScript avec Deno comme runtime. Ce choix a été en partie par l'expérience et les preférences des membres du groupe, mais il a également des avantages techniques. Le typage statique rend le code plus sûr et plus robuste et sa syntaxe proche du langage naturel facilite la lecture et la compréhension.

Nous avons également utilisé Python pour la visualisation des résultats, en particulier avec les bibliothèques Matplotlib et NumPy pour tracer des graphiques.

Une cli a été développée pour faciliter l'interaction avec le code et lancer les différents tests. Pour l'executer, il suffit de lancer la commande suivante:
```
./cli [command] [options]
```

Pour plus d'information, veuillez vous référer au README.md
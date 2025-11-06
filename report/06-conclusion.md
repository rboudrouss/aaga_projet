# 4. Conclusion

Ce projet nous a permis d'implémenter et d'analyser trois algorithmes fondamentaux pour le calcul de centralité dans les graphes : PageRank, Personalized PageRank (PPR) et la méthode d'approximation PUSH. Les résultats expérimentaux confirment globalement les prédictions théoriques tout en révélant certains comportements intéressants.

## 4.1. Synthèse des résultats

Nos expérimentations ont démontré que PageRank et PPR présentent des comportements de convergence similaires, avec une complexité par itération en $O(N + M)$ comme attendu. PPR nécessite généralement plus d'itérations que PageRank en raison des gradients de probabilité plus prononcés créés par la concentration de la téléportation sur les seeds.

La méthode PUSH s'est révélée systématiquement plus rapide que PPR dans la majorité des cas testés. La distance L1 entre PUSH et PPR décroît linéairement avec $\epsilon$, conformément à la théorie. L'analyse de détection de communautés via PPR a montré des résultats cohérents avec une distribution des scores suivant une décroissance exponentielle caractéristique.

## 4.2. Limites et observations

Certains résultats ont révélé des comportements inattendus. Nous avons observé une tendance contre-intuitive du temps d'exécution moyen à diminuer avec la tolérance pour PageRank et PPR, dont l'origine reste incertaine. Par ailleurs, le speedup de PUSH par rapport à PPR stagne malgré l'augmentation de la taille du graphe, ce qui est contre-intuitif. Une hypothèse est que nos graphes de taille 50 sont peut-être trop petits pour observer le comportement local attendu.

## 4.3. Pistes d'amélioration

- Nos expérimentations se sont concentrées sur des graphes de 50 nœuds. Cette taille relativement modeste a pu influencer certains résultats, notamment les comportements observés avec PUSH. Des graphes plus grands permettraient d'observer plus clairement les comportements asymptotiques théoriques.

- Il serait pertinent de tester les algorithmes sur différents types de graphes : graphes scale-free, graphes avec structure de communautés prononcée, graphes réguliers, ou encore des graphes réels issus de réseaux sociaux ou de citations scientifiques. Ces différentes topologies pourraient révéler des comportements spécifiques et permettre de mieux comprendre dans quels contextes chaque algorithme excelle.
- Le choix de $\epsilon$ pour PUSH mériterait une étude plus systématique en fonction de la taille et de la structure du graphe. Il serait intéressant d'établir des heuristiques pour sélectionner automatiquement un $\epsilon$ optimal offrant le meilleur compromis précision/performance selon les caractéristiques du graphe.
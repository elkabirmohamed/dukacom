---
name: Firestore query indexes
description: Resilient handling of filtered and sorted Firestore queries.
---

Les requêtes Firestore qui filtrent sur un champ et trient sur un autre peuvent exiger un index composite qui n’est pas présent par défaut.

**Why:** Un index manquant fait échouer toute la promesse de lecture, même si les règles autorisent l’accès et que les documents existent.

**How to apply:** Pour les petits volumes, charger avec le filtre simple puis trier côté client. Sinon, créer et versionner explicitement l’index composite avant d’utiliser la requête triée.
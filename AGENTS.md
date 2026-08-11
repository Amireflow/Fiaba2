# Fiaba — Notes projet

Monorepo pnpm. L'application livrable est `artifacts/fiaba` (React 19 + Vite + Tailwind 4
+ wouter + Supabase). `artifacts/mockup-sandbox` est un bac à sable de maquettes.

## Commandes de vérification

Toujours exécuter depuis la racine du dépôt :

```powershell
pnpm --filter @workspace/fiaba typecheck   # tsc --noEmit
pnpm --filter @workspace/fiaba build       # build Vite (~20 s)
pnpm --filter @workspace/fiaba dev         # serveur de dev
```

Il n'y a pas de linter ni de suite de tests configurés.

## Architecture

- `src/App.tsx` — page d'accueil publique + routeur racine. Les quatre espaces sont
  chargés en `lazy()`, ne pas les importer statiquement.
- `src/features/{admin,merchant,seller,shop}/` — un routeur par espace, lui-même en
  `lazy()` par page. `shop` est le tunnel d'achat public (non authentifié).
- `src/hooks/use-auth.tsx` — contexte d'authentification. Expose `profile`, `merchant`,
  `merchantId`, `seller`, `sellerId`. **Utiliser `merchantId`/`sellerId` depuis ce
  contexte** plutôt que de refaire une requête sur `sellers`/`merchants` dans une page.
- `src/hooks/use-supabase-query.ts` — hooks de requête maison avec cache SWR mémoire
  (30 s) : `useSupabaseQuery`, `useMerchantQuery`, `useSellerQuery`. Options :
  `select`, `filter`, `order`, `limit`, `enabled`.
- `supabase/migrations/` — appliquées par ordre alphabétique du nom de fichier.
  Attention : certains numéros sont dupliqués historiquement (deux `0005_`, deux
  `0006_`…). Vérifier le dernier numéro utilisé avant d'en ajouter une.

## Règles de performance (à respecter impérativement)

Ces règles viennent d'un audit de performance ; les enfreindre reproduit des lenteurs
déjà corrigées.

1. **Fonctions helper RLS : toujours `STABLE`.** `is_admin()`, `is_merchant_owner()`,
   `is_seller()` sont utilisées dans ~163 clauses RLS. Sans le marqueur `stable`,
   PostgreSQL les considère `VOLATILE` et les ré-exécute **une fois par ligne**, ce qui
   provoque des seq scans complets. Corrigé en `0031`.
2. **Envelopper `auth.uid()` dans `(select auth.uid())`** au sein des policies, pour
   qu'il soit évalué une seule fois par requête (InitPlan) et non par ligne.
3. **Toujours borner les listes** avec `.limit()`. Aucune requête ne doit être non
   bornée, en particulier sur `orders`, `products`, `campaigns`, `commissions`,
   `profiles`, et sur le catalogue de découverte (qui porte sur toute la plateforme).
4. **Paralléliser avec `Promise.all`** les requêtes indépendantes. Ne chaîner que les
   requêtes réellement dépendantes.
5. **Agréger en SQL, pas en JavaScript.** Ne pas télécharger une table pour en compter
   les lignes ou en sommer une colonne : passer par une RPC (cf.
   `admin_platform_stats()` en `0033`).
6. **Ne pas bloquer le premier rendu** sur des données secondaires. Exemple : dans le
   checkout, les zones de livraison ne servent qu'à l'étape 2 et sont chargées en
   arrière-plan.
7. **Dépendances de `useEffect` : utiliser des identifiants**, pas les objets `profile`
   ou `merchant` (leur identité change à chaque rendu et déclenche des refetch).

## Appels RPC

Les types générés dans `src/types/database.ts` ne contiennent pas les fonctions RPC.
Convention du projet : `(supabase.rpc as any)('nom_fonction', { ... })`.

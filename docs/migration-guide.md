# Example: Migrating ClientView to use unified loading

This example shows how to migrate from local loading state to the unified system.

## Before (Old Pattern)

```tsx
"use client";

import * as React from "react";
import { getClient } from "@/app/actions/clients-actions";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientDetailView() {
  const [client, setClient] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function fetchClient() {
      try {
        setIsLoading(true);
        const result = await getClient(id);
        if (result.success) {
          setClient(result.client);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError("Connection error");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) fetchClient();
  }, [id]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>{/* Client details */}</div>;
}
```

**Problems:**

- 15+ lines of boilerplate
- Manual loading state management
- No caching
- Local spinner (inconsistent UX)

## After (New Pattern)

```tsx
"use client";

import * as React from "react";
import { useServerAction } from "@/contexts/loading-context";
import { getClient } from "@/app/actions/clients-actions";

export default function ClientDetailView() {
  const params = useParams();
  const id = params.id as string;

  const {
    data: client,
    error,
    isLoading,
  } = useServerAction(
    `client-${id}`,
    () => getClient(id),
    { cache: { ttl: 2 * 60 * 1000 } }, // Cache for 2 min
  );

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erreur</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !client) {
    return null; // Global loader shows automatically
  }

  return <div>{/* Client details */}</div>;
}
```

**Benefits:**

- Only 5 lines for data loading (vs 15+)
- Automatic caching (2 min TTL)
- Global spinner (consistent UX)
- Auto cleanup on unmount
- Better error handling

## Migration Checklist

When migrating a component:

1. ✅ Remove `useState` for `isLoading`, `data`, `error`
2. ✅ Replace `useEffect` with `useServerAction` hook
3. ✅ Remove local `<Skeleton>` or `<BrandLoader>` (use global)
4. ✅ Add cache TTL based on data type:
   - Static data (categories, brands): 30 min
   - Semi-static (clients, products): 2-5 min
   - Dynamic (sales, stats): No cache or 30 sec
5. ✅ Test that loading indicator appears correctly

## Advanced: Manual Loading Control

For complex operations (multi-step, custom UI):

```tsx
import { useGlobalLoading } from "@/contexts/loading-context";

function CreateSaleForm() {
  const { startLoading, stopLoading } = useGlobalLoading("create-sale");

  async function handleSubmit() {
    try {
      startLoading();

      // Step 1: Validate
      await validateSale(data);

      // Step 2: Create
      await createSale(data);

      // Step 3: Generate invoice
      await generateInvoice(saleId);

      toast({ title: "Vente créée !" });
    } catch (err) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      stopLoading();
    }
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Cache Invalidation

After mutations, invalidate related cache:

```tsx
import { invalidateCachePattern } from "@/lib/action-cache";

async function handleCreateClient(data) {
  const result = await createClient(data);

  if (result.success) {
    // Invalidate all client-related caches
    invalidateCachePattern(/^client-/);

    toast({ title: "Client créé !" });
  }
}
```

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ShoppingListItem } from '@shared/schema';

interface CreateShoppingItemPayload {
  houseId: number;
  addedById: number;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  note?: string | null;
}

interface CommitShoppingChangesPayload {
  houseId: number;
  editorUserId: number;
  summary?: string;
}

export function useShoppingList(houseId?: number) {
  const queryClient = useQueryClient();
  const listQueryKey = ['/api/shopping-items', houseId] as const;

  const sortItems = (items: ShoppingListItem[]) =>
    [...items].sort((a, b) => {
      if (a.isPurchased !== b.isPurchased) return a.isPurchased ? 1 : -1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const { data: items = [], isLoading } = useQuery<ShoppingListItem[]>({
    queryKey: listQueryKey,
    queryFn: async () => {
      if (!houseId) return [];
      const res = await fetch(`/api/shopping-items?houseId=${houseId}`);
      if (!res.ok) throw new Error('Failed to fetch shopping list items');
      return res.json();
    },
    enabled: !!houseId,
  });

  const createItemMutation = useMutation({
    mutationFn: async (payload: CreateShoppingItemPayload) => {
      const res = await apiRequest('POST', '/api/shopping-items', payload);
      return res.json();
    },
    onSuccess: (createdItem: ShoppingListItem) => {
      queryClient.setQueryData<ShoppingListItem[]>(listQueryKey, (old = []) =>
        sortItems([...old, createdItem])
      );
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ShoppingListItem> }) => {
      const res = await apiRequest('PATCH', `/api/shopping-items/${id}`, updates);
      return res.json();
    },
    onSuccess: (updatedItem: ShoppingListItem) => {
      queryClient.setQueryData<ShoppingListItem[]>(listQueryKey, (old = []) =>
        sortItems(old.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
      );
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/shopping-items/${id}`);
      await res.json();
      return id;
    },
    onSuccess: (deletedId: number) => {
      queryClient.setQueryData<ShoppingListItem[]>(listQueryKey, (old = []) =>
        old.filter((item) => item.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  const commitChangesMutation = useMutation({
    mutationFn: async (payload: CommitShoppingChangesPayload) => {
      const res = await apiRequest('POST', '/api/shopping-items/commit', payload);
      return res.json();
    },
  });

  return {
    items,
    isLoading,
    createItem: createItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    commitChanges: commitChangesMutation.mutateAsync,
    isCreating: createItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
    isCommitting: commitChangesMutation.isPending,
  };
}
